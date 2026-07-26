export interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

/** A minimal trend indicator — no axes, no interactivity, used inside a card that already has the value/label. */
export function Sparkline({ data, color, width = 96, height = 28 }: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = data[data.length - 1]!;
  const lastX = width;
  const lastY = height - ((last - min) / range) * height;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={3} fill={color} stroke="var(--color-card)" strokeWidth={1.5} />
    </svg>
  );
}
