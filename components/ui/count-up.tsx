'use client';

import { useEffect, useRef, useState } from 'react';

type CountUpProps = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
};

function format(value: number, decimals: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function CountUp({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 900,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const currentRef = useRef(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let started = false;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const run = () => {
      const from = currentRef.current;
      const delta = value - from;

      if (reduce || Math.abs(delta) < 0.0001) {
        currentRef.current = value;
        frame = requestAnimationFrame(() => setDisplay(value));
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const next = from + delta * eased;
        currentRef.current = next;
        setDisplay(next);

        if (t < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          currentRef.current = value;
          setDisplay(value);
        }
      };

      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={`count ${className ?? ''}`} aria-live="off">
      {prefix}
      {format(display, decimals)}
      {suffix}
    </span>
  );
}
