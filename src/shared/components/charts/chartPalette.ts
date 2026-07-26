/**
 * Categorical slots — validated (CVD + contrast) via the dataviz skill's
 * validator against this app's actual light/dark card surfaces. Fixed
 * order, assigned by identity (index in a stable list), never reassigned
 * by rank or filter state.
 */
export const CATEGORICAL_CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
] as const;

export function categoricalColor(index: number): string {
  return CATEGORICAL_CHART_COLORS[index % CATEGORICAL_CHART_COLORS.length] ?? CATEGORICAL_CHART_COLORS[0];
}

/** Sequential magnitude scale — one hue (the app's primary), light→dark via mix with the card surface. */
export function sequentialColor(intensity: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, intensity)) * 85 + 8);
  return `color-mix(in oklab, var(--color-primary) ${pct}%, var(--color-card))`;
}

/** Whether label text on a sequentialColor(intensity) fill should be light or dark for contrast. */
export function textOnSequential(intensity: number): 'light' | 'dark' {
  return intensity > 0.45 ? 'light' : 'dark';
}
