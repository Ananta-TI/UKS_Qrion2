'use client';

import { useEffect, useState } from 'react';

export type ChartColors = {
  primary: string;
  secondary: string;
  soft: string;
};

/** Nilai cadangan bila CSS variable belum terbaca (mis. saat pra-render). */
const fallback: ChartColors = { primary: '#51c590', secondary: '#302e59', soft: '#51c590' };

function readChartColors(): ChartColors {
  if (typeof window === 'undefined') return fallback;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fb: string) => styles.getPropertyValue(name).trim() || fb;

  return {
    primary: read('--iris', fallback.primary),
    secondary: read('--ink', fallback.secondary),
    soft: read('--iris', fallback.soft),
  };
}

/**
 * ECharts merender ke canvas, jadi var(--…) tidak bisa dipakai langsung.
 * Nilai dibaca dari CSS variable di klien agar palet tetap sinkron dengan
 * design system (tidak lagi disalin manual sebagai hex).
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(fallback);

  useEffect(() => {
    // Dibaca setelah paint agar stylesheet sudah terpasang.
    const id = requestAnimationFrame(() => setColors(readChartColors()));
    return () => cancelAnimationFrame(id);
  }, []);

  return colors;
}
