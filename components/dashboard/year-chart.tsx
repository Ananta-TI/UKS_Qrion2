'use client';

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

export type YearPoint = {
  label: string;
  total: number;
  referred: number;
  returned?: number;
};

type Series = 'total' | 'returned';

const W = 980;
const H = 260;
const LEFT = 44;
const RIGHT = 968;
const TOP = 12;
const BOTTOM = 234;

/** Skala Y bulat supaya gridline selalu 0 / setengah / maksimum. */
function niceMax(value: number) {
  const target = Math.max(1, (Number.isFinite(value) ? value : 0) / 2);
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const n = target / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  return Math.max(2, step * 2);
}

/** Kurva halus (Catmull-Rom → cubic Bézier) seperti referensi. */
function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  const tension = 0.18;
  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return d;
}

function formatTick(value: number) {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }
  return String(Math.round(value));
}

export function YearChart({ points }: { points: YearPoint[] }) {
  const [series, setSeries] = useState<Series>('total');
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const months = points.length
    ? points
    : Array.from({ length: 12 }, (_, index) => ({
        label: new Date(new Date().getFullYear(), index, 1).toLocaleDateString('id-ID', { month: 'short' }),
        total: 0,
        referred: 0,
        returned: 0,
      }));

  const primaryLabel = series === 'total' ? 'Kunjungan' : 'Kembali ke kelas';

  const { primary, secondary, max, ticks, primaryPoints, secondaryPoints, step, areaPath, primaryPath, secondaryPath } =
    useMemo(() => {
      const stepX = (RIGHT - LEFT) / Math.max(1, months.length - 1);
      const primaryValues = months.map((month) =>
        series === 'total'
          ? month.total
          : (month.returned ?? Math.max(0, month.total - (month.referred ?? 0)))
      );
      const secondaryValues = months.map((month) => month.referred ?? 0);
      const scaleMax = niceMax(Math.max(0, ...primaryValues, ...secondaryValues));

      const yFor = (value: number) => BOTTOM - (value / scaleMax) * (BOTTOM - TOP);
      const toPoints = (values: number[]) =>
        values.map((value, index) => ({ x: LEFT + index * stepX, y: yFor(value) }));

      const primaryPts = toPoints(primaryValues);
      const secondaryPts = toPoints(secondaryValues);
      const line = smoothPath(primaryPts);

      return {
        primary: primaryValues,
        secondary: secondaryValues,
        max: scaleMax,
        ticks: [0, scaleMax / 2, scaleMax],
        primaryPoints: primaryPts,
        secondaryPoints: secondaryPts,
        step: stepX,
        areaPath: `${line} L${RIGHT},${BOTTOM} L${LEFT},${BOTTOM} Z`,
        primaryPath: line,
        secondaryPath: smoothPath(secondaryPts),
      };
    }, [months, series]);

  const year = new Date().getFullYear();
  const nowMonthIndex = Math.min(new Date().getMonth(), months.length - 1);
  const activeIndex = hover !== null && hover >= 0 && hover < months.length ? hover : null;

  const totalYear = primary.reduce((sum, value) => sum + value, 0);

  function pointerToIndex(event: PointerEvent<HTMLDivElement>) {
    const element = svgRef.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (!rect.width) return null;
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const index = Math.round((x - LEFT) / step);
    return Math.max(0, Math.min(months.length - 1, index));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const current = activeIndex ?? (event.key === 'ArrowRight' ? -1 : months.length);
      const next = event.key === 'ArrowRight' ? current + 1 : current - 1;
      setHover(Math.max(0, Math.min(months.length - 1, next)));
    }
    if (event.key === 'Escape') setHover(null);
  }

  const tipLeft = activeIndex === null ? 0 : (primaryPoints[activeIndex].x / W) * 100;
  const tipTop = activeIndex === null ? 0 : (Math.min(primaryPoints[activeIndex].y, secondaryPoints[activeIndex].y) / H) * 100;

  return (
    <section className="card chartc year-chart">
      <header className="card__head">
        <div className="card__title">
          <BarChart3 className="ico" />
          <span>
            Tahun sekilas
            <span className="card__sub">Naik-turun kunjungan sepanjang {year}</span>
          </span>
        </div>

        <div className="seg" role="group" aria-label="Pilih metrik grafik">
          <button
            type="button"
            className={`seg__btn ${series === 'total' ? 'is-active' : ''}`}
            aria-pressed={series === 'total'}
            onClick={() => setSeries('total')}
          >
            {series === 'total' && (
              <motion.span
                layoutId="year-chart-seg-pill"
                className="seg__pill"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>Kunjungan &amp; rujukan</span>
          </button>
          <button
            type="button"
            className={`seg__btn ${series === 'returned' ? 'is-active' : ''}`}
            aria-pressed={series === 'returned'}
            onClick={() => setSeries('returned')}
          >
            {series === 'returned' && (
              <motion.span
                layoutId="year-chart-seg-pill"
                className="seg__pill"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>Kembali ke kelas</span>
          </button>
        </div>
      </header>

      <div
        className="chartc__plot chart"
        tabIndex={0}
        role="group"
        aria-label={`Grafik ${primaryLabel.toLowerCase()} dan rujukan per bulan`}
        style={{ '--area': 'var(--chart)' } as CSSProperties}
        onPointerMove={(event) => setHover(pointerToIndex(event))}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setHover(null)}
      >
        <svg ref={svgRef} className="chart__svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img">
          <defs>
            <linearGradient id="yearAreaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" className="chart__stop0" />
              <stop offset="1" className="chart__stop1" />
            </linearGradient>
          </defs>

          <g className="chart__grid">
            {ticks.map((tick, index) => {
              const y = BOTTOM - (tick / max) * (BOTTOM - TOP);
              return (
                <g key={index}>
                  <line x1={LEFT} x2={RIGHT} y1={y} y2={y} />
                  <text x={LEFT - 8} y={y + 4} textAnchor="end">
                    {formatTick(tick)}
                  </text>
                </g>
              );
            })}
          </g>

          <g className="chart__plot chart-reveal-effect" key={series}>
            <path className="chart__area chart__area--iris" fill="url(#yearAreaFill)" d={areaPath} />
            <path className="chart__line chart__line--iris" d={primaryPath} />
            <path className="chart__line chart__line--coral is-dashed" d={secondaryPath} />
          </g>

          <g className="chart__x">
            {months.map((month, index) => (
              <text
                key={`${month.label}-${index}`}
                x={LEFT + index * step}
                y={254}
                textAnchor={index === 0 ? 'start' : index === months.length - 1 ? 'end' : 'middle'}
              >
                {month.label}
              </text>
            ))}
          </g>

          {activeIndex !== null && (
            <>
              <line
                className="chart__cross"
                x1={primaryPoints[activeIndex].x}
                x2={primaryPoints[activeIndex].x}
                y1={TOP}
                y2={BOTTOM}
              />
              <g className="chart__dots">
                <circle
                  cx={primaryPoints[activeIndex].x}
                  cy={primaryPoints[activeIndex].y}
                  r={4.5}
                  fill="var(--iris)"
                  stroke="var(--raised)"
                  strokeWidth={2}
                />
                <circle
                  cx={secondaryPoints[activeIndex].x}
                  cy={secondaryPoints[activeIndex].y}
                  r={4}
                  fill="var(--coral)"
                  stroke="var(--raised)"
                  strokeWidth={2}
                />
              </g>
            </>
          )}
        </svg>

        {activeIndex !== null && (
          <div
            className="chart__tip"
            role="status"
            aria-live="polite"
            style={{
              opacity: 1,
              left: `clamp(70px, ${tipLeft}%, calc(100% - 70px))`,
              top: `${tipTop}%`,
              transform: 'translate(-50%, calc(-100% - 12px))',
            }}
          >
            <b>{months[activeIndex].label}</b>
            <span>
              <i className="tone--iris" />
              {primaryLabel} <strong>{primary[activeIndex].toLocaleString('id-ID')}</strong>
            </span>
            <span>
              <i className="tone--coral" />
              Rujukan <strong>{secondary[activeIndex].toLocaleString('id-ID')}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="legend chartc__legend">
        <span>
          <i className="tone--iris" />
          {primaryLabel}
        </span>
        <span>
          <i className="tone--coral" />
          Rujukan
        </span>
        <span className="muted">
          · {months[nowMonthIndex].label} adalah bulan berjalan ({primary[nowMonthIndex].toLocaleString('id-ID')}{' '}
          {series === 'total' ? 'kunjungan' : 'siswa'})
        </span>
      </div>

      <span className="sr-only">Total setahun: {totalYear.toLocaleString('id-ID')}</span>
    </section>
  );
}
