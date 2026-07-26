import type { AIAssistantResponse } from '../../types/ai.types';
import type { BarDatum } from '../../shared/components/charts/BarChart';
import type { EmergingCategory } from '../../shared/lib/computeAnalytics';

/**
 * Modus Operandi Analysis, Repeat Offender Analysis, and Predictive Crime
 * Insights all need either free-text pattern matching or forecasting —
 * genuinely AI work, not something to fake with client heuristics. These
 * are grounded in the real distribution/trend numbers computed elsewhere
 * on this page, clearly labeled as a sample of the response shape rather
 * than presented as real analysis.
 */

export function sampleModusOperandiInsight(categories: BarDatum[]): AIAssistantResponse {
  const top = [...categories].sort((a, b) => b.value - a.value)[0];
  return {
    answer: top
      ? `Would cross-reference case narratives and evidence descriptions within "${top.label}" cases (${top.value} logged) to surface recurring entry methods, timing, and tools — the kind of pattern that's only visible reading free text across cases, not from structured fields.`
      : 'Not enough cases logged yet to compare methods across incidents.',
    reasoning: 'Requires NLP over case/evidence narrative text — not derivable from structured counts alone.',
    confidence: 0.55,
  };
}

export function sampleRepeatOffenderInsight(): AIAssistantResponse {
  return {
    answer:
      'Would identify people appearing as a suspect across multiple cases by resolving identity across the Network graph and case records — this needs a confirmed case-to-entity link that the current schema doesn’t guarantee, so it’s not safe to compute client-side yet.',
    reasoning: 'Blocked on data model, not just the AI Function: Network entities aren’t reliably linked back to the cases they appear in.',
    confidence: 0.4,
  };
}

export function samplePredictiveInsight(emerging: EmergingCategory[]): AIAssistantResponse {
  const top = emerging.find((e) => (e.growthPct ?? 0) > 0);
  return {
    answer: top
      ? `Would forecast near-term volume using ${top.category}'s recent trend (${top.recentCount} in the last window, up from ${top.priorCount}) alongside seasonal and district-level patterns — real forecasting needs a model, not a linear extrapolation of two data points.`
      : 'Would forecast near-term crime volume by category and district using historical trend data once enough periods are logged.',
    reasoning: 'Forecasting requires a trained model over multi-period historical data — what’s shown elsewhere on this page is a two-period comparison, which is a trend signal, not a prediction.',
    confidence: 0.45,
  };
}
