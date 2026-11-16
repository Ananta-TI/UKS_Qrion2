'use client';

import { useMemo } from 'react';
import { BarChart } from '@/components/charts/bar-chart';
import { Bar } from '@/components/charts/bar';
import { BarYAxis } from '@/components/charts/bar-y-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import { TooltipContent } from '@/components/charts/tooltip/tooltip-content';

export type ReportBarDatum = {
  key: string;
  label: string;
  value: number;
};

function formatCount(value: number) {
  return value.toLocaleString('id-ID');
}

/**
 * Grafik batang horizontal Bklit UI untuk daftar kategori laporan (mis. kelas).
 * Tinggi mengikuti jumlah baris supaya label kategori tetap terbaca, sementara
 * nilai dan porsinya tampil di tooltip.
 */
export default function ReportBarsChart({ data }: { data: ReportBarDatum[] }) {
  const total = useMemo(() => data.reduce((sum, row) => sum + row.value, 0), [data]);
  const rows = useMemo(
    () =>
      data.map((row) => ({
        label: row.label,
        value: row.value,
        share: total ? (row.value / total) * 100 : 0,
      })),
    [data, total]
  );
  const height = Math.max(210, rows.length * 34 + 26);
  // Bklit hanya memutar animasi masuk saat `revealSignature` berubah.
  // Sertakan label + nilai supaya ganti metrik/periode langsung memicu
  // batang tumbuh ulang, bukan snap ke nilai baru.
  const revealSignature = useMemo(
    () => rows.map((row) => `${row.label}:${row.value}`).join('|'),
    [rows]
  );

  if (rows.length === 0) {
    return <div className="h-full w-full" />;
  }

  return (
    <div style={{ height }} aria-label="Grafik batang kategori laporan">
      <BarChart
        data={rows}
        xDataKey="label"
        orientation="horizontal"
        className="h-full"
        aspectRatio="auto"
        margin={{ top: 8, right: 18, bottom: 8, left: 96 }}
        barGap={0.3}
        revealSignature={revealSignature}
      >
        <Grid horizontal={false} vertical fadeVertical stroke="var(--chart-grid)" />
        <Bar
          dataKey="value"
          fill="var(--iris)"
          lineCap={6}
          showValue
          valueLabelColor="var(--on-accent)"
          valueLabelFormatter={formatCount}
        />
        <BarYAxis maxLabels={12} />
        <ChartTooltip
          showDatePill={false}
          content={({ point }) => {
            const share = Number(point.share) || 0;
            return (
              <TooltipContent
                title={String(point.label ?? '')}
                rows={[
                  {
                    color: 'var(--iris)',
                    label: 'Kunjungan',
                    value: formatCount(Number(point.value) || 0),
                  },
                  {
                    color: 'var(--muted)',
                    label: 'Porsi',
                    value: `${share.toLocaleString('id-ID', {
                      maximumFractionDigits: 1,
                    })}%`,
                  },
                ]}
              />
            );
          }}
        />
      </BarChart>
    </div>
  );
}
