export interface BarDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  valueFormatter?: (value: number) => string;
  maxItems?: number;
  emptyMessage?: string;
}

/**
 * Horizontal magnitude comparison — one hue (sequential), direct-labeled.
 * Not categorical: the job here is ranking/comparing counts, not telling
 * series apart, so every bar shares the same color per the dataviz skill's
 * form guidance.
 */
export function BarChart({ data, valueFormatter = String, maxItems = 8, emptyMessage = 'No data yet.' }: BarChartProps) {
  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-muted-foreground" title={row.label}>
            {row.label}
          </span>
          <div className="h-4 min-w-0 flex-1 rounded-sm bg-muted">
            <div
              className="h-full rounded-r-sm bg-primary"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm font-medium text-foreground">
            {valueFormatter(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
