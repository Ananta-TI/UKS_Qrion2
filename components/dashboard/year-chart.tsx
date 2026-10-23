'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { EChartsAreaChart, type ChartConfig } from '@/components/evilcharts/charts/echarts-area-chart';

export type YearPoint = {
  label: string;
  total: number;
  referred: number;
  returned?: number;
};

type Series = 'total' | 'returned';

export function YearChart({ points }: { points: YearPoint[] }) {
  const [series, setSeries] = useState<Series>('total');

  const totalYear = useMemo(
    () => points.reduce((sum, p) => sum + (p.total ?? 0), 0),
    [points]
  );
  const returnedYear = useMemo(
    () => points.reduce((sum, p) => sum + (p.returned ?? Math.max(0, (p.total ?? 0) - (p.referred ?? 0))), 0),
    [points]
  );

  const chartData = useMemo(() => {
    return points.map((p) => ({
      month: p.label,
      primary: series === 'total' ? p.total : (p.returned ?? Math.max(0, p.total - p.referred)),
      referred: p.referred,
    }));
  }, [points, series]);

  const chartConfig = useMemo(() => {
    const isTotal = series === 'total';
    return {
      primary: {
        label: isTotal ? 'Kunjungan' : 'Kembali ke kelas',
        colors: {
          light: ['#10b981', '#0ea5e9', '#8b5cf6'],
          dark: ['#34d399', '#38bdf8', '#a78bfa'],
        },
      },
      referred: {
        label: 'Rujukan',
        colors: {
          light: ['#f97316', '#ea580c'],
          dark: ['#fb923c', '#f97316'],
        },
      },
    } satisfies ChartConfig;
  }, [series]);

  const currentMonthName = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
    } catch {
      return 'Bulan ini';
    }
  }, []);

  const displayTotal = series === 'total' ? totalYear : returnedYear;

  return (
    <section className="card dash-year">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--glass-2)] border border-[var(--rim)] flex items-center justify-center shrink-0 text-[var(--text)]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[var(--text)] text-base font-semibold tracking-tight">
              Tahun sekilas
            </span>
            <span className="text-[var(--muted)] text-xs">
              Naik-turun kunjungan sepanjang {new Date().getFullYear()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Segmented Metric Switch */}
          <div className="seg" role="group" aria-label="Pilih metrik data">
            <button
              type="button"
              className={`seg__btn ${series === 'total' ? 'is-active' : ''}`}
              aria-pressed={series === 'total'}
              onClick={() => setSeries('total')}
            >
              {series === 'total' && (
                <motion.span
                  layoutId="year-chart-seg-pill"
                  className="seg__pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>Kunjungan &amp; Rujukan</span>
            </button>
            <button
              type="button"
              className={`seg__btn ${series === 'returned' ? 'is-active' : ''}`}
              aria-pressed={series === 'returned'}
              onClick={() => setSeries('returned')}
            >
              {series === 'returned' && (
                <motion.span
                  layoutId="year-chart-seg-pill"
                  className="seg__pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>Kembali ke kelas</span>
            </button>
          </div>

          {/* Quick Counter */}
          <div className="hidden md:flex flex-col items-end text-right pl-2 border-l border-[var(--line)]">
            <span className="text-xl font-bold tracking-tight text-[var(--text)] leading-none">
              {displayTotal.toLocaleString('id-ID')}
            </span>
            <span className="text-[var(--muted)] text-[10.5px] mt-0.5">
              {series === 'total' ? 'Total kunjungan' : 'Total kembali ke kelas'}
            </span>
          </div>
        </div>
      </div>

      {/* ECharts Area Chart Container */}
      <div key={`chart-box-${series}`} className="relative w-full flex-1" style={{ minHeight: 220, height: 240 }}>
        <EChartsAreaChart
          key={`chart-instance-${series}`}
          data={chartData}
          config={chartConfig}
          xDataKey="month"
          className="h-full w-full"
          curveType="monotone"
          chartOptions={{
            grid: {
              left: 36,
              right: 16,
              top: 18,
              bottom: 24,
            },
            yAxis: {
              type: 'value',
              min: 0,
              splitNumber: 3,
            },
          }}
        >
          <EChartsAreaChart.Tooltip variant="frosted-glass" />
          <EChartsAreaChart.Area
            dataKey="primary"
            variant="gradient"
            strokeVariant="solid"
            strokeWidth={2.5}
          />
          <EChartsAreaChart.Area
            dataKey="referred"
            variant="gradient"
            strokeVariant="dashed"
            strokeWidth={1.8}
          />
        </EChartsAreaChart>
      </div>

      {/* Legend & Footnote */}
      <div className="legend chartc__legend mt-3 pt-3">
        <span>
          <i
            style={{
              background: series === 'total' ? '#10b981' : '#0ea5e9',
              width: 8,
              height: 8,
              borderRadius: '50%',
              display: 'inline-block',
            }}
          />
          {series === 'total' ? 'Kunjungan' : 'Kembali ke kelas'}
        </span>
        <span>
          <i
            style={{
              background: '#f97316',
              width: 8,
              height: 8,
              borderRadius: '50%',
              display: 'inline-block',
            }}
          />
          Rujukan
        </span>
        <span className="muted">
          · {currentMonthName} adalah bulan berjalan ({displayTotal.toLocaleString('id-ID')}{' '}
          {series === 'total' ? 'kunjungan' : 'siswa'})
        </span>
      </div>
    </section>
  );
}
