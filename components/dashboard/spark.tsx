type SparklineProps = {
  values: number[];
  tone?: string;
  className?: string;
};

function points(values: number[], width = 100, height = 32, pad = 3.5) {
  const series = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const step = (width - pad * 2) / (series.length - 1);

  return series
    .map((value, index) => {
      const x = pad + step * index;
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function Sparkline({ values, tone = 'chart', className }: SparklineProps) {
  const path = points(values);

  return (
    <svg
      className={`dash-spark ${className ?? ''}`}
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="dash-spark__line"
        d={path}
        fill="none"
        stroke={`var(--${tone})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
