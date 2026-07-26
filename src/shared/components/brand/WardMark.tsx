/**
 * The WARD emblem — a fedora-and-bust silhouette in a badge circle, in
 * fixed navy/cream brand colors (not theme-tokens): a mark like this reads
 * as an identity, not a themed UI surface, so it stays constant across
 * light/dark mode. Pure SVG, no image asset — crisp at any size from a
 * 16px favicon up to a sign-in hero.
 */
export function WardMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="WARD"
    >
      <defs>
        <clipPath id="ward-mark-clip">
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>

      <g clipPath="url(#ward-mark-clip)">
        <rect x="0" y="0" width="100" height="100" fill="var(--color-brand-navy)" />

        {/* Shoulders / coat */}
        <path
          d="M 50 52 C 37 52 28 57 22 66 L 6 104 L 94 104 L 78 66 C 72 57 63 52 50 52 Z"
          fill="var(--color-brand-cream)"
        />

        {/* Neck */}
        <rect x="43" y="48" width="14" height="10" fill="var(--color-brand-cream)" />

        {/* Head */}
        <ellipse cx="50" cy="41" rx="13" ry="15" fill="var(--color-brand-cream)" />

        {/* Hat crown */}
        <path d="M 34 30 C 34 17 41 12 50 12 C 59 12 66 17 66 30 Z" fill="var(--color-brand-cream)" />

        {/* Hat brim */}
        <ellipse cx="50" cy="33" rx="29" ry="5" fill="var(--color-brand-cream)" />

        {/* Hat band, sitting above the brim */}
        <rect x="33" y="23.5" width="34" height="5" fill="var(--color-brand-navy)" />
      </g>

      <circle cx="50" cy="50" r="47" fill="none" stroke="var(--color-brand-cream)" strokeWidth="2.5" />
    </svg>
  );
}
