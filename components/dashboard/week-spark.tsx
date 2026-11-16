'use client';

import { type CSSProperties, useMemo } from 'react';
import { BarSparkline, LineSparkline } from '@/components/charts/sparkline';

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};

export type WeekPoint = {
  key: string;
  label: string;
  total: number;
  referred: number;
};

/**
 * Grafik mini 7 hari di kartu "Kunjungan hari ini".
 * Batang = total kunjungan, garis = rujukan. Keduanya memakai Bklit Sparkline
 * agar animasi, radius, dan ritme visualnya sama dengan grafik lain.
 */
export function WeekSpark({ points }: { points: WeekPoint[] }) {
  const max = useMemo(
    () => Math.max(1, ...points.map((point) => point.total)),
    [points]
  );

  return (
    <div className="dash-week">
      <div className="dash-week__plot">
        <BarSparkline
          data={points}
          dataKey="total"
          height={74}
          padding={2}
          color="var(--chart)"
          barGap={6}
          barRadius={4}
          yDomain={[0, max]}
          interactive={false}
          aria-label="Kunjungan 7 hari terakhir"
        />
        <LineSparkline
          data={points}
          dataKey="referred"
          height={74}
          padding={2}
          color="var(--chart-2)"
          strokeWidth={2}
          curve="monotone"
          endDot
          yDomain={[0, max]}
          interactive={false}
          style={overlayStyle}
          aria-label="Rujukan 7 hari terakhir"
        />
      </div>
      <div
        className="dash-week__labels"
        style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {points.map((point) => (
          <span key={point.key}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}
