import { cn } from '../../lib/utils';
import { sequentialColor, textOnSequential } from './chartPalette';

export interface HeatMatrixProps {
  rows: string[];
  columns: string[];
  /** values[row][column] = count */
  values: Record<string, Record<string, number>>;
  emptyMessage?: string;
}

/** District × category intensity grid — the "heatmap." One hue, light→dark by count, per cell. */
export function HeatMatrix({ rows, columns, values, emptyMessage = 'No data yet.' }: HeatMatrixProps) {
  if (rows.length === 0 || columns.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const max = Math.max(1, ...rows.flatMap((r) => columns.map((c) => values[r]?.[c] ?? 0)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 4 }}>
        <thead>
          <tr>
            <th className="w-28" />
            {columns.map((col) => (
              <th key={col} className="pb-1 text-left text-xs font-medium text-muted-foreground">
                <span className="block max-w-[80px] truncate" title={col}>
                  {col}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <th scope="row" className="pr-2 text-right text-xs font-medium text-muted-foreground">
                <span className="block max-w-[110px] truncate" title={row}>
                  {row}
                </span>
              </th>
              {columns.map((col) => {
                const value = values[row]?.[col] ?? 0;
                const intensity = value / max;
                return (
                  <td key={col} className="p-0">
                    <div
                      className={cn(
                        'flex h-9 w-full min-w-[48px] items-center justify-center rounded text-xs font-medium',
                        textOnSequential(intensity) === 'light' ? 'text-white' : 'text-foreground'
                      )}
                      style={{ backgroundColor: sequentialColor(intensity) }}
                      title={`${row} · ${col}: ${value}`}
                    >
                      {value > 0 ? value : ''}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
