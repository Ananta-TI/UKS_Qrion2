'use client';

import { useEffect, useState } from 'react';

const fallback = { primary: '#2563a8', secondary: '#9cc3f3', soft: '#bcd4f2' };

/**
 * ECharts merender ke canvas, jadi var(--…) tidak bisa dipakai langsung.
 * Hook ini membaca token aksen aktif dan ikut berubah saat tema/aksen diganti.
 */
export function useChartColors() {
  const [colors, setColors] = useState(fallback);

  useEffect(() => {
    let frame = 0;

    const read = () => {
      const style = getComputedStyle(document.documentElement);
      const primary = style.getPropertyValue('--iris').trim() || fallback.primary;
      const secondary = style.getPropertyValue('--dot').trim() || fallback.secondary;
      const soft = style.getPropertyValue('--accent').trim() || fallback.soft;

      setColors((prev) =>
        prev.primary === primary && prev.secondary === secondary && prev.soft === soft
          ? prev
          : { primary, secondary, soft }
      );
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };

    read();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-accent', 'data-density'],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return colors;
}
