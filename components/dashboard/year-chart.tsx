'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { Area, AreaChart } from '@/components/charts/area-chart';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import { TooltipContent } from '@/components/charts/tooltip/tooltip-content';
import { Grid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { YAxis } from '@/components/charts/y-axis';

export type YearPoint = {
  label: string;
  total: number;
  referred: number;
  returned?: number;
};

type Series = 'total' | 'returned';

function formatCount(value: number) {
  return value.toLocaleString('id-ID');
}

export function YearChart({ points }: { points: YearPoint[] }) {
  const [series, setSeries] = useState<Series>('total');
  const year = new Date().getFullYear();

  const months = useMemo(
    () =>
      points.length
        ? points
        : Array.from({ length: 12 }, (_, index) => ({
            label: new Date(year, index, 1).toLocaleDateString('id-ID', { month: 'short' }),
            total: 0,
            referred: 0,
            returned: 0,
          })),
    [points, year]
  );

  const primaryLabel = series === 'total' ? 'Kunjungan' : 'Kembali ke kelas';
  const labels = months.map((month) => month.label);

  const chartData = useMemo(
    () =>
      months.map((month, index) => ({
        date: new Date(year, index, 1),
        primary: series === 'total' ? month.total : (month.returned ?? 0),
        referred: month.referred ?? 0,
      })),
    [months, series, year]
  );

  const indexByTime = useMemo(
    () => new Map(chartData.map((point, index) => [point.date.getTime(), index])),
    [chartData]
  );

  const totalYear = chartData.reduce((sum, point) => sum + point.primary, 0);
  const nowMonthIndex = Math.min(new Date().getMonth(), months.length - 1);

  return (
    <section className="card chartc year-chart">
      <header className="card__head">
        <div className="card__title">
          <BarChart3 className="ico" />
          <span>
            Tahun sekilas
            <span className="card__sub">Naik-turun kunjungan sepanjang {year}</span>
          </span>
        </div>

        <div className="seg" role="group" aria-label="Pilih metrik grafik">
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
            <span style={{ position: 'relative', zIndex: 1 }}>Kunjungan &amp; rujukan</span>
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
      </header>

      <div
        className="chartc__plot year-chart__bklit bklit-chart"
        role="group"
        aria-label={`Grafik ${primaryLabel.toLowerCase()} dan rujukan per bulan`}
      >
        <AreaChart
          data={chartData}
          xDataKey="date"
          className="bklit-chart"
          margin={{ top: 16, right: 14, bottom: 30, left: 42 }}
          style={{ height: 260, aspectRatio: 'auto' }}
        >
          <Grid horizontal numTicksRows={3} stroke="var(--chart-grid)" />
          <Area
            dataKey="primary"
            fill="var(--iris)"
            stroke="var(--iris)"
            fillOpacity={0.3}
            gradientToOpacity={0}
            strokeWidth={2.5}
          />
          <Area
            dataKey="referred"
            fill="transparent"
            stroke="var(--coral)"
            fillOpacity={0}
            strokeWidth={2}
            dashFromIndex={0}
            dashArray="5,4"
            showHighlight={false}
          />
          <XAxis
            labels={labels}
            numTicks={{ base: 6, sm: 8, md: 12, lg: 12, xl: 12 }}
            tickMode="data"
          />
          <YAxis numTicks={3} />
          <ChartTooltip
            showDatePill={false}
            dateLabels={labels}
            content={({ point }) => {
              const date = point.date instanceof Date ? point.date : new Date(String(point.date));
              const index = indexByTime.get(date.getTime()) ?? 0;
              const month = months[index];
              return (
                <TooltipContent
                  title={month.label}
                  rows={[
                    {
                      color: 'var(--iris)',
                      label: primaryLabel,
                      value: formatCount(chartData[index].primary),
                    },
                    {
                      color: 'var(--coral)',
                      label: 'Rujukan',
                      value: formatCount(chartData[index].referred),
                    },
                  ]}
                />
              );
            }}
          />
        </AreaChart>
      </div>

      <div className="legend chartc__legend">
        <span>
          <i className="tone--iris" />
          {primaryLabel}
        </span>
        <span>
          <i className="tone--coral" />
          Rujukan
        </span>
        <span className="muted">
          · {months[nowMonthIndex].label} adalah bulan berjalan (
          {formatCount(chartData[nowMonthIndex].primary)}{' '}
          {series === 'total' ? 'kunjungan' : 'kembali ke kelas'})
        </span>
      </div>

      <span className="sr-only">Total setahun: {formatCount(totalYear)}</span>
    </section>
  );
}
