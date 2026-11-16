'use client';

import { useMemo } from 'react';
import { Area, AreaChart } from '@/components/charts/area-chart';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import { TooltipContent } from '@/components/charts/tooltip/tooltip-content';
import { Grid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { YAxis } from '@/components/charts/y-axis';

type ChartDatum = Record<string, string | number>;

function formatCount(value: number) {
  return value.toLocaleString('id-ID');
}

/**
 * Grafik tren laporan dengan Bklit UI. Data kategori/tanggal dari laporan
 * dipetakan ke deret waktu berurutan agar sumbu-x tetap rapi, sementara label
 * asli ditampilkan lewat `XAxis labels` dan tooltip.
 */
export default function ReportAreaChart({
  data,
  xDataKey = 'label',
  className = 'h-full w-full',
}: {
  data: ChartDatum[];
  xDataKey?: string;
  className?: string;
}) {
  const labels = data.map((row) => String(row[xDataKey] ?? ''));
  const chartData = useMemo(
    () =>
      data.map((row, index) => ({
        date: new Date(2024, 0, 1 + index),
        value: Number(row.value) || 0,
      })),
    [data]
  );
  const indexByTime = useMemo(
    () => new Map(chartData.map((point, index) => [point.date.getTime(), index])),
    [chartData]
  );

  if (chartData.length === 0) {
    return <div className={className} />;
  }

  return (
    <AreaChart
      data={chartData}
      xDataKey="date"
      className={className}
      margin={{ top: 18, right: 16, bottom: 30, left: 42 }}
      style={{ height: '100%', minHeight: 220, aspectRatio: 'auto' }}
    >
      <Grid horizontal numTicksRows={3} stroke="var(--chart-grid)" />
      <Area
        dataKey="value"
        fill="var(--iris)"
        stroke="var(--iris)"
        fillOpacity={0.3}
        gradientToOpacity={0}
        strokeWidth={2.5}
      />
      <XAxis
        labels={labels}
        numTicks={{ base: 4, sm: 5, md: 7, lg: 9, xl: 10 }}
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
                  label: 'Jumlah',
                  value: formatCount(chartData[index].value),
                },
              ]}
            />
          );
        }}
      />
    </AreaChart>
  );
}
