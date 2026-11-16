'use client';

import { useMemo } from 'react';
import { Area, AreaChart } from '@/components/charts/area-chart';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import { TooltipContent } from '@/components/charts/tooltip/tooltip-content';
import { Grid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { YAxis } from '@/components/charts/y-axis';

export type MedicineMovePoint = { label: string; masuk: number; keluar: number };

function formatCount(value: number) {
  return value.toLocaleString('id-ID');
}

/**
 * Grafik pergerakan stok obat: jumlah masuk (restok) vs keluar (diberikan).
 * Memakai komponen area Bklit UI yang sama dengan grafik kunjungan agar
 * tampilan, animasi, dan efeknya konsisten.
 */
export default function MedicineMoveChart({ data }: { data: MedicineMovePoint[] }) {
  const labels = data.map((point) => point.label);
  const chartData = useMemo(
    () =>
      data.map((point, index) => ({
        date: new Date(2024, 0, 1 + index),
        masuk: point.masuk,
        keluar: point.keluar,
      })),
    [data]
  );
  const indexByTime = useMemo(
    () => new Map(chartData.map((point, index) => [point.date.getTime(), index])),
    [chartData]
  );

  if (chartData.length === 0) {
    return <div className="h-full w-full" />;
  }

  return (
    <AreaChart
      data={chartData}
      xDataKey="date"
      className="h-full w-full"
      margin={{ top: 18, right: 16, bottom: 30, left: 38 }}
      style={{ height: 240, minHeight: 200, aspectRatio: 'auto' }}
    >
      <Grid horizontal numTicksRows={3} stroke="var(--chart-grid)" />
      <Area
        dataKey="masuk"
        fill="var(--iris)"
        stroke="var(--iris)"
        fillOpacity={0.24}
        gradientToOpacity={0}
        strokeWidth={2.5}
      />
      <Area
        dataKey="keluar"
        fill="var(--bad)"
        stroke="var(--bad)"
        fillOpacity={0.1}
        gradientToOpacity={0}
        strokeWidth={2}
        dashFromIndex={0}
        dashArray="5,4"
        showHighlight={false}
      />
      <XAxis
        labels={labels}
        numTicks={{ base: 4, sm: 5, md: 6, lg: 8, xl: 10 }}
        tickMode="data"
      />
      <YAxis numTicks={3} />
      <ChartTooltip
        showDatePill={false}
        dateLabels={labels}
        content={({ point }) => {
          const date = point.date instanceof Date ? point.date : new Date(String(point.date));
          const index = indexByTime.get(date.getTime()) ?? 0;
          return (
            <TooltipContent
              title={labels[index]}
              rows={[
                {
                  color: 'var(--iris)',
                  label: 'Masuk',
                  value: formatCount(chartData[index].masuk),
                },
                {
                  color: 'var(--bad)',
                  label: 'Keluar',
                  value: formatCount(chartData[index].keluar),
                },
              ]}
            />
          );
        }}
      />
    </AreaChart>
  );
}
