'use client';

import { LineSparkline } from '@/components/charts/sparkline';

type SparklineProps = {
  values: number[];
  tone?: string;
  className?: string;
};

/**
 * Sparkline tipis untuk kartu KPI. Memakai LineSparkline dari Bklit UI agar
 * animasi dan bentuk kurvanya konsisten dengan grafik utama. Interaktif
 * supaya crosshair, dot, dan highlight muncul saat hover seperti di docs.
 */
export function Sparkline({ values, tone = 'chart', className }: SparklineProps) {
  const series = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const data = series.map((value, index) => ({ index, value }));
  const color = `var(--${tone})`;

  return (
    <LineSparkline
      data={data}
      dataKey="value"
      width={82}
      height={34}
      padding={4}
      color={color}
      strokeWidth={2}
      interactive
      className={className}
      style={{ flex: 'none' }}
      aria-label="Ringkasan tren"
    />
  );
}
