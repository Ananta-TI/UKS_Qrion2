'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts/core';
import type { ECharts as EChartsInstance } from 'echarts/core';
import type { EChartsOption, SeriesOption } from 'echarts';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export type ChartConfig = Record<
  string,
  {
    label?: string;
    colors?: {
      light?: string[];
      dark?: string[];
    };
    color?: string;
  }
>;

export interface EChartsAreaChartProps {
  data: Record<string, any>[];
  config?: ChartConfig;
  xDataKey: string;
  className?: string;
  curveType?: 'monotone' | 'linear' | 'step';
  chartOptions?: EChartsOption;
  children?: React.ReactNode;
  height?: number | string;
}

export interface AreaProps {
  dataKey: string;
  variant?: 'gradient' | 'solid';
  strokeVariant?: 'solid' | 'dashed';
  strokeWidth?: number;
  color?: string;
  name?: string;
  children?: React.ReactNode;
}

export interface TooltipProps {
  variant?: 'frosted-glass' | 'default';
}

export interface ActiveDotProps {
  variant?: 'ping' | 'dot';
}

function Area(_props: AreaProps) {
  return null;
}
Area.displayName = 'EChartsAreaChart.Area';

function Tooltip(_props: TooltipProps) {
  return null;
}
Tooltip.displayName = 'EChartsAreaChart.Tooltip';

function ActiveDot(_props: ActiveDotProps) {
  return null;
}
ActiveDot.displayName = 'EChartsAreaChart.ActiveDot';

function Grid(_props: any) {
  return null;
}
Grid.displayName = 'EChartsAreaChart.Grid';

function XAxis(_props: any) {
  return null;
}
XAxis.displayName = 'EChartsAreaChart.XAxis';

function YAxis(_props: any) {
  return null;
}
YAxis.displayName = 'EChartsAreaChart.YAxis';

function Legend(_props: any) {
  return null;
}
Legend.displayName = 'EChartsAreaChart.Legend';

export function EChartsAreaChart({
  data,
  config = {},
  xDataKey,
  className = 'h-full w-full',
  curveType = 'monotone',
  chartOptions = {},
  children,
  height = '100%',
}: EChartsAreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<EChartsInstance | null>(null);

  // Extract Area children configurations
  const areaConfigs = useMemo(() => {
    const areas: AreaProps[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && (child.type as any)?.displayName === 'EChartsAreaChart.Area') {
        areas.push(child.props as AreaProps);
      }
    });

    if (areas.length === 0) {
      // Fallback: build from config keys
      Object.keys(config).forEach((key) => {
        areas.push({ dataKey: key, variant: 'gradient', strokeVariant: 'solid', strokeWidth: 2.5 });
      });
    }

    return areas;
  }, [children, config]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Check if dark theme is active
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark';

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(containerRef.current, isDark ? 'dark' : undefined, {
        renderer: 'canvas',
        devicePixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 2, 2.5) : 2,
      });
    }

    const chart = chartInstanceRef.current;
    const xCategories = data.map((item) => String(item[xDataKey] ?? ''));

    const seriesList: SeriesOption[] = areaConfigs.map((area, idx) => {
      const cfg = config[area.dataKey];
      const colors = isDark ? cfg?.colors?.dark : cfg?.colors?.light;
      const primaryColor =
        area.color ??
        (colors && colors.length > 0 ? colors[0] : undefined) ??
        cfg?.color ??
        (idx === 0 ? '#35bb82' : idx === 1 ? '#8e8e93' : '#1f3b30');

      const secondaryColor =
        (colors && colors.length > 1 ? colors[1] : undefined) ?? primaryColor;

      const seriesData = data.map((item) => Number(item[area.dataKey] ?? 0));

      const isDashed = area.strokeVariant === 'dashed';
      const strokeWidth = area.strokeWidth ?? 2.5;

      const areaStyleOption =
        area.variant === 'gradient'
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: hexToRgba(primaryColor, 0.42) },
                { offset: 0.5, color: hexToRgba(secondaryColor, 0.16) },
                { offset: 1, color: hexToRgba(secondaryColor, 0) },
              ]),
            }
          : undefined;

      return {
        name: cfg?.label ?? area.name ?? area.dataKey,
        type: 'line',
        data: seriesData,
        smooth: curveType === 'monotone' ? 0.35 : false,
        step: curveType === 'step' ? 'start' : false,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        animation: true,
        animationDuration: 1200,
        animationEasing: 'cubicOut',
        lineStyle: {
          width: strokeWidth,
          color: primaryColor,
          type: isDashed ? 'dashed' : 'solid',
        },
        itemStyle: {
          color: primaryColor,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        emphasis: {
          focus: 'series',
          scale: true,
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 2.5,
            shadowBlur: 10,
            shadowColor: hexToRgba(primaryColor, 0.45),
          },
        },
        areaStyle: areaStyleOption,
      };
    });

    const defaultOptions: EChartsOption = {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 1200,
      animationEasing: 'cubicOut',
      grid: {
        left: 36,
        right: 14,
        top: 20,
        bottom: 26,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        appendToBody: true,
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.18)',
            width: 1.5,
            type: 'dashed',
          },
        },
        backgroundColor: isDark ? 'rgba(24, 24, 27, 0.88)' : 'rgba(255, 255, 255, 0.94)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: isDark ? '#ffffff' : '#09090b',
          fontSize: 12,
          fontFamily: 'inherit',
        },
        extraCssText:
          'backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 12px; box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.08);',
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const title = params[0].axisValueLabel || params[0].name;
          const rows = params
            .map((p: any) => {
              const color = p.color;
              const val = Number(p.value ?? 0).toLocaleString('id-ID');
              return `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:5px;">
                <span style="display:inline-flex;align-items:center;gap:7px;font-size:12px;color:${isDark ? '#d4d4d8' : '#52525b'};">
                  <span style="width:7px;height:7px;border-radius:50%;background:${color};display:inline-block;flex:none;"></span>
                  ${p.seriesName}
                </span>
                <strong style="font-size:12px;font-weight:700;color:${isDark ? '#ffffff' : '#09090b'};">${val}</strong>
              </div>`;
            })
            .join('');

          return `<div style="min-width:125px;">
            <div style="font-size:11px;font-weight:700;color:${isDark ? '#a1a1aa' : '#71717a'};margin-bottom:3px;text-transform:uppercase;letter-spacing:0.04em;">
              ${title}
            </div>
            ${rows}
          </div>`;
        },
      },
      xAxis: {
        type: 'category',
        data: xCategories,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: isDark ? '#a1a1aa' : '#71717a',
          fontSize: 11,
          margin: 10,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
            type: 'dashed',
          },
        },
        axisLabel: {
          color: isDark ? '#a1a1aa' : '#71717a',
          fontSize: 11,
        },
      },
      series: seriesList,
    };

    // Deep merge chartOptions
    const mergedOptions = {
      ...defaultOptions,
      ...chartOptions,
      grid: {
        ...((defaultOptions.grid as object) || {}),
        ...((chartOptions.grid as object) || {}),
      },
      yAxis: {
        ...((defaultOptions.yAxis as object) || {}),
        ...((chartOptions.yAxis as object) || {}),
      },
      xAxis: {
        ...((defaultOptions.xAxis as object) || {}),
        ...((chartOptions.xAxis as object) || {}),
        data: xCategories,
      },
      series: seriesList,
    };

    chart.setOption(mergedOptions, true);

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, areaConfigs, config, xDataKey, curveType, chartOptions]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`chart-reveal-effect ${className}`}
      style={{ height, minHeight: 180, width: '100%', position: 'relative' }}
    />
  );
}

function hexToRgba(hex: string, alpha: number) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex;
  }
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c
      .split('')
      .map((x) => x + x)
      .join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(37, 99, 168, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

EChartsAreaChart.Area = Area;
EChartsAreaChart.Tooltip = Tooltip;
EChartsAreaChart.ActiveDot = ActiveDot;
EChartsAreaChart.Grid = Grid;
EChartsAreaChart.XAxis = XAxis;
EChartsAreaChart.YAxis = YAxis;
EChartsAreaChart.Legend = Legend;
