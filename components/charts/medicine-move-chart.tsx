'use client';

import { EChartsAreaChart, type ChartConfig } from '@/components/evilcharts/charts/echarts-area-chart';

export type MedicineMovePoint = { label: string; masuk: number; keluar: number };

/**
 * Grafik pergerakan stok obat: jumlah masuk (restok) vs keluar (diberikan).
 * Memakai komponen area yang sama dengan grafik kunjungan agar tampilan,
 * animasi, dan efeknya konsisten.
 */
export default function MedicineMoveChart({
  data,
  config,
}: {
  data: MedicineMovePoint[];
  config: ChartConfig;
}) {
  return (
    <EChartsAreaChart
      data={data}
      config={config}
      xDataKey="label"
      className="h-full w-full"
      curveType="monotone"
      chartOptions={{
        grid: { left: 36, right: 18, top: 20, bottom: 26 },
        yAxis: { type: 'value', min: 0, splitNumber: 3 },
      }}
    >
      <EChartsAreaChart.Tooltip variant="frosted-glass" />
      <EChartsAreaChart.Area
        dataKey="masuk"
        name="Masuk"
        color="#35bb82"
        variant="gradient"
        strokeVariant="solid"
        strokeWidth={2.5}
      />
      <EChartsAreaChart.Area
        dataKey="keluar"
        name="Keluar"
        color="#d70015"
        variant="solid"
        strokeVariant="dashed"
        strokeWidth={2.5}
      />
    </EChartsAreaChart>
  );
}
