import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TrendLineChartProps {
  data: TrendPoint[];
  valueFormatter?: (value: number) => string;
  height?: number;
  emptyMessage?: string;
}

const VIEW_WIDTH = 600;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 24;

/** Single-series trend over time — sequential (one hue), with a hover crosshair + tooltip per the dataviz skill (line/area ships interactivity by default). */
export function TrendLineChart({
  data,
  valueFormatter = String,
  height = 180,
  emptyMessage = 'No data yet.',
}: TrendLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const plotWidth = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  const points = data.map((d, i) => {
    const x = PADDING_LEFT + (data.length === 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth);
    const y = PADDING_TOP + plotHeight - (d.value / maxValue) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]!.x.toFixed(1)} ${(PADDING_TOP + plotHeight).toFixed(1)} L ${points[0]!.x.toFixed(1)} ${(PADDING_TOP + plotHeight).toFixed(1)} Z`;

  const gridLines = [0, 0.5, 1].map((t) => PADDING_TOP + plotHeight * t);

  function handleMove(event: ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined;
  const labelStride = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((y) => (
          <line key={y} x1={PADDING_LEFT} x2={VIEW_WIDTH - PADDING_RIGHT} y1={y} y2={y} stroke="var(--color-chart-grid)" strokeWidth={1} />
        ))}

        <path d={areaPath} fill="var(--color-primary)" opacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 || i === hoverIndex ? 4 : 2.5}
            fill="var(--color-primary)"
            stroke="var(--color-card)"
            strokeWidth={2}
          />
        ))}

        {hovered && (
          <line x1={hovered.x} x2={hovered.x} y1={PADDING_TOP} y2={PADDING_TOP + plotHeight} stroke="var(--color-primary)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        )}

        {points.map((p, i) =>
          i % labelStride === 0 || i === points.length - 1 ? (
            <text key={i} x={p.x} y={height - 6} fontSize={10} textAnchor="middle" fill="var(--color-muted-foreground)">
              {p.label}
            </text>
          ) : null
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-2 py-1 text-xs shadow-md"
          style={{ left: `${(hovered.x / VIEW_WIDTH) * 100}%`, top: `${(hovered.y / height) * 100}%` }}
        >
          <span className="font-medium text-foreground">{valueFormatter(hovered.value)}</span>
          <span className="ml-1 text-muted-foreground">{hovered.label}</span>
        </div>
      )}
    </div>
  );
}
