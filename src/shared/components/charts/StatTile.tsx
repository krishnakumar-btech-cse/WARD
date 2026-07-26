import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatTileProps {
  label: string;
  value: string;
  deltaLabel?: string;
  deltaDirection?: 'up' | 'down' | 'flat';
  /** Which direction counts as good — colors the delta green/red accordingly. Omit for a neutral (non-judged) delta. */
  goodDirection?: 'up' | 'down';
}

const DELTA_ICON = { up: ArrowUp, down: ArrowDown, flat: Minus };

export function StatTile({ label, value, deltaLabel, deltaDirection, goodDirection }: StatTileProps) {
  const DeltaIcon = deltaDirection ? DELTA_ICON[deltaDirection] : null;
  const isGood = goodDirection && deltaDirection ? deltaDirection === goodDirection : null;
  const deltaTone =
    isGood === null || deltaDirection === 'flat'
      ? 'text-muted-foreground'
      : isGood
        ? 'text-success'
        : 'text-critical';

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-foreground">{value}</p>
      {deltaLabel && (
        <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium', deltaTone)}>
          {DeltaIcon && <DeltaIcon className="h-3 w-3" />}
          {deltaLabel}
        </p>
      )}
    </div>
  );
}
