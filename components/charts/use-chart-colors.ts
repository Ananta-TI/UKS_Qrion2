'use client';

const colors = { primary: '#51c590', secondary: '#302e59', soft: '#51c590' };

/**
 * ECharts merender ke canvas, jadi var(--…) tidak bisa dipakai langsung.
 * Palet aplikasi sekarang tetap, jadi nilainya bisa dipakai langsung.
 */
export function useChartColors() {
  return colors;
}
