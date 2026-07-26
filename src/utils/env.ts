/**
 * App-wide feature flags. This build has no external backend to configure,
 * so the only flag that matters is whether tables missing/empty data show
 * realistic sample rows (used throughout the resolveTableDisplay fallback
 * chain) — always on, since every table is genuinely populated locally.
 */
export const env = {
  features: {
    enableSampleDataFallback: true,
  },
};
