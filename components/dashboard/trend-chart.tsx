'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Area, AreaChart } from '@/components/charts/area-chart';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import { TooltipContent } from '@/components/charts/tooltip/tooltip-content';
import { Grid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { YAxis } from '@/components/charts/y-axis';

export type TrendPoint = {
  /** Waktu titik dalam milidetik (dibuat di server agar stabil). */
  date: number;
  label: string;
  total: number;
};

const periodOptions = [
  { key: '7', label: '7 hari' },
  { key: '30', label: '30 hari' },
  { key: '90', label: '3 bulan' },
  { key: '365', label: '1 tahun' },
];

export function TrendChart({
  points,
  periodKey,
  periodLabel,
  total,
  delta,
}: {
  points: TrendPoint[];
  periodKey: string;
  periodLabel: string;
  total: number;
  delta: number | null;
}) {
  const chartData = useMemo(
    () => points.map((point) => ({ date: new Date(point.date), value: point.total })),
    [points]
  );
  const labels = useMemo(() => points.map((point) => point.label), [points]);

  return (
    <section className="card trend">
      <header className="trend__head">
        <div className="trend__intro">
          <h2 className="trend__title">Tren kunjungan</h2>
          <p className="trend__summary">
            <b>{total.toLocaleString('id-ID')} kunjungan</b> dalam {periodLabel} terakhir
            {delta !== null && (
              <>
                {' · '}
                <span
                  className={`trend__delta ${
                    delta < 0 ? 'is-down' : delta > 0 ? 'is-up' : ''
                  }`}
                >
                  {delta !== 0 &&
                    (delta < 0 ? (
                      <ArrowDownRight className="ico" />
                    ) : (
                      <ArrowUpRight className="ico" />
                    ))}
                  {delta === 0
                    ? 'tetap'
                    : `${delta < 0 ? 'turun' : 'naik'} ${Math.abs(delta)}%`}{' '}
                  dari periode sebelumnya
                </span>
              </>
            )}
          </p>
        </div>

        <nav className="trend__seg" aria-label="Pilih periode tren kunjungan">
          {periodOptions.map((item) => (
            <Link
              key={item.key}
              href={item.key === '30' ? '/' : `/?period=${item.key}`}
              prefetch={false}
              className="trend__pill"
              aria-pressed={periodKey === item.key}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div
        className="trend__plot bklit-chart"
        role="group"
        aria-label={`Grafik tren kunjungan ${periodLabel} terakhir`}
      >
        <AreaChart
          data={chartData}
          xDataKey="date"
          className="bklit-chart"
          margin={{ top: 18, right: 14, bottom: 30, left: 38 }}
          style={{ height: 300, aspectRatio: 'auto' }}
        >
          <Grid horizontal numTicksRows={4} stroke="var(--chart-grid)" />
          <Area
            dataKey="value"
            fill="var(--iris)"
            stroke="var(--iris)"
            fillOpacity={0.24}
            gradientToOpacity={0}
            strokeWidth={2.5}
          />
          <XAxis
            labels={labels}
            numTicks={{ base: 4, sm: 5, md: 7, lg: 8, xl: 8 }}
            tickMode="data"
          />
          <YAxis numTicks={4} />
          <ChartTooltip
            showDatePill={false}
            dateLabels={labels}
            content={({ index }) => (
              <TooltipContent
                title={labels[index] ?? ''}
                rows={[
                  {
                    color: 'var(--iris)',
                    label: 'Kunjungan',
                    value: points[index]?.total ?? 0,
                  },
                ]}
              />
            )}
          />
        </AreaChart>
      </div>
    </section>
  );
}
