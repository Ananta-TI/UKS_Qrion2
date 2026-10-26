'use client';

import { EChartsAreaChart, type ChartConfig } from '@/components/evilcharts/charts/echarts-area-chart';
import type { EChartsOption } from 'echarts';

type ChartDatum = Record<string, string | number>;

export default function ReportAreaChart({
  data,
  config,
  xDataKey = 'label',
  className = 'h-full w-full',
  curveType = 'monotone',
  chartOptions,
}: {
  data: ChartDatum[];
  config: ChartConfig;
  xDataKey?: string;
  className?: string;
  curveType?: 'monotone' | 'linear' | 'step';
  chartOptions?: EChartsOption;
}) {
  return (
    <EChartsAreaChart
      data={data}
      config={config}
      xDataKey={xDataKey}
      className={className}
      curveType={curveType}
      chartOptions={chartOptions}
    >
      <EChartsAreaChart.Tooltip variant="frosted-glass" />
      <EChartsAreaChart.Area
        dataKey="value"
        variant="gradient"
        strokeVariant="solid"
        strokeWidth={2.5}
      />
    </EChartsAreaChart>
  );
}
