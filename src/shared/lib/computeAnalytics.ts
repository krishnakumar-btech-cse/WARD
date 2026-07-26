import type { CatalystColumnMeta } from '../../types/catalyst-sdk';
import type { CatalystRow } from '../../types/catalyst.types';
import { parseTimestamp } from './utils';
import type { BarDatum } from '../components/charts/BarChart';
import type { TrendPoint } from '../components/charts/TrendLineChart';

/**
 * Every function here is plain aggregation over real rows — grouping,
 * counting, period comparison. No AI, no Function, nothing to fake. Same
 * honesty as the AI Analyst's "computed" capabilities and the Network
 * graph's centrality math. Shared between Crime Pattern Analytics and the
 * Command Intelligence Dashboard, which aggregate the same case data at two
 * different scopes (deep single-table analysis vs. cross-module overview).
 */

function countBy(rows: CatalystRow[], column: CatalystColumnMeta | undefined): BarDatum[] {
  if (!column) return [];
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[column.column_name] ?? '').trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
}

export function computeCategoryDistribution(cases: CatalystRow[], crimeTypeColumn?: CatalystColumnMeta): BarDatum[] {
  return countBy(cases, crimeTypeColumn);
}

export function computeDistrictDistribution(cases: CatalystRow[], districtColumn?: CatalystColumnMeta): BarDatum[] {
  return countBy(cases, districtColumn);
}

export function computeStationDistribution(cases: CatalystRow[], stationColumn?: CatalystColumnMeta): BarDatum[] {
  return countBy(cases, stationColumn);
}

/** Generic value-frequency count — status/priority breakdowns, officer workload, task status, anything "group by column, count rows." */
export function computeValueDistribution(rows: CatalystRow[], column?: CatalystColumnMeta): BarDatum[] {
  return countBy(rows, column);
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function computeMonthlyTrend(cases: CatalystRow[], months = 6): TrendPoint[] {
  const now = new Date();
  const buckets: TrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: MONTH_LABELS[d.getMonth()]!, value: 0 });
  }
  for (const row of cases) {
    const ms = parseTimestamp(row.CREATEDTIME);
    if (!ms) continue;
    const date = new Date(ms);
    const monthsAgo = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (monthsAgo >= 0 && monthsAgo < months) {
      const bucket = buckets[months - 1 - monthsAgo];
      if (bucket) bucket.value += 1;
    }
  }
  return buckets;
}

export function computeWeeklyTrend(cases: CatalystRow[], weeks = 8): TrendPoint[] {
  const now = new Date();
  const dayMs = 86_400_000;
  const buckets: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ label: `W-${i}`, value: 0 });
  }
  for (const row of cases) {
    const ms = parseTimestamp(row.CREATEDTIME);
    if (!ms) continue;
    const weeksAgo = Math.floor((now.getTime() - ms) / (7 * dayMs));
    if (weeksAgo >= 0 && weeksAgo < weeks) {
      const bucket = buckets[weeks - 1 - weeksAgo];
      if (bucket) bucket.value += 1;
    }
  }
  return buckets;
}

const TIME_OF_DAY_BUCKETS = [
  { label: 'Night (12–4a)', start: 0, end: 4 },
  { label: 'Early AM (4–8a)', start: 4, end: 8 },
  { label: 'Morning (8a–12p)', start: 8, end: 12 },
  { label: 'Afternoon (12–4p)', start: 12, end: 16 },
  { label: 'Evening (4–8p)', start: 16, end: 20 },
  { label: 'Late (8p–12a)', start: 20, end: 24 },
];

/** Buckets by case-registration hour — a proxy for incident time-of-day, since no separate incident-time field is confirmed. */
export function computeTimeOfDayDistribution(cases: CatalystRow[]): BarDatum[] {
  const buckets = TIME_OF_DAY_BUCKETS.map((b) => ({ label: b.label, value: 0 }));
  for (const row of cases) {
    const ms = parseTimestamp(row.CREATEDTIME);
    if (!ms) continue;
    const hour = new Date(ms).getHours();
    const index = TIME_OF_DAY_BUCKETS.findIndex((b) => hour >= b.start && hour < b.end);
    if (index >= 0) buckets[index]!.value += 1;
  }
  return buckets;
}

export interface HeatMatrixData {
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>;
}

export function computeCrimeHeatMatrix(
  cases: CatalystRow[],
  districtColumn: CatalystColumnMeta | undefined,
  crimeTypeColumn: CatalystColumnMeta | undefined,
  maxRows = 6,
  maxColumns = 6
): HeatMatrixData {
  if (!districtColumn || !crimeTypeColumn) return { rows: [], columns: [], values: {} };

  const districtCounts = computeDistrictDistribution(cases, districtColumn).sort((a, b) => b.value - a.value);
  const categoryCounts = computeCategoryDistribution(cases, crimeTypeColumn).sort((a, b) => b.value - a.value);
  const rows = districtCounts.slice(0, maxRows).map((d) => d.label);
  const columns = categoryCounts.slice(0, maxColumns).map((d) => d.label);

  const values: Record<string, Record<string, number>> = {};
  for (const row of cases) {
    const district = String(row[districtColumn.column_name] ?? '').trim();
    const category = String(row[crimeTypeColumn.column_name] ?? '').trim();
    if (!rows.includes(district) || !columns.includes(category)) continue;
    values[district] ??= {};
    values[district]![category] = (values[district]![category] ?? 0) + 1;
  }

  return { rows, columns, values };
}

export interface HotspotEntry {
  label: string;
  count: number;
  isHotspot: boolean;
}

/** Flags districts/stations disproportionately above the mean — a plain statistical threshold, not ML clustering. */
export function computeHotspots(distribution: BarDatum[], thresholdMultiplier = 1.3): HotspotEntry[] {
  if (distribution.length === 0) return [];
  const mean = distribution.reduce((sum, d) => sum + d.value, 0) / distribution.length;
  return [...distribution]
    .sort((a, b) => b.value - a.value)
    .map((d) => ({ label: d.label, count: d.value, isHotspot: d.value >= mean * thresholdMultiplier }));
}

export interface RiskIndicator {
  label: string;
  caseCount: number;
  highPriorityShare: number;
  riskScore: number;
}

export function computeRiskIndicators(
  cases: CatalystRow[],
  districtColumn: CatalystColumnMeta | undefined,
  priorityColumn: CatalystColumnMeta | undefined,
  topN = 5
): RiskIndicator[] {
  if (!districtColumn) return [];

  const byDistrict = new Map<string, { total: number; highPriority: number }>();
  for (const row of cases) {
    const district = String(row[districtColumn.column_name] ?? '').trim();
    if (!district) continue;
    const entry = byDistrict.get(district) ?? { total: 0, highPriority: 0 };
    entry.total += 1;
    if (priorityColumn) {
      const priority = String(row[priorityColumn.column_name] ?? '').toLowerCase();
      if (priority.includes('high') || priority.includes('critical')) entry.highPriority += 1;
    }
    byDistrict.set(district, entry);
  }

  const maxCount = Math.max(1, ...Array.from(byDistrict.values()).map((v) => v.total));

  return Array.from(byDistrict.entries())
    .map(([label, { total, highPriority }]) => {
      const share = total > 0 ? highPriority / total : 0;
      const riskScore = Math.round(((total / maxCount) * 0.6 + share * 0.4) * 100);
      return { label, caseCount: total, highPriorityShare: share, riskScore };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, topN);
}

export interface EmergingCategory {
  category: string;
  recentCount: number;
  priorCount: number;
  growthPct: number | null;
}

/** Compares the last N days against the previous N days per category — a trend delta, not a forecast. */
export function computeEmergingCategories(
  cases: CatalystRow[],
  crimeTypeColumn: CatalystColumnMeta | undefined,
  windowDays = 30
): EmergingCategory[] {
  if (!crimeTypeColumn) return [];
  const now = Date.now();
  const dayMs = 86_400_000;
  const recentStart = now - windowDays * dayMs;
  const priorStart = now - 2 * windowDays * dayMs;

  const recent = new Map<string, number>();
  const prior = new Map<string, number>();

  for (const row of cases) {
    const category = String(row[crimeTypeColumn.column_name] ?? '').trim();
    if (!category) continue;
    const ms = parseTimestamp(row.CREATEDTIME);
    if (!ms) continue;
    if (ms >= recentStart) {
      recent.set(category, (recent.get(category) ?? 0) + 1);
    } else if (ms >= priorStart) {
      prior.set(category, (prior.get(category) ?? 0) + 1);
    }
  }

  const categories = new Set([...recent.keys(), ...prior.keys()]);
  return Array.from(categories)
    .map((category) => {
      const recentCount = recent.get(category) ?? 0;
      const priorCount = prior.get(category) ?? 0;
      const growthPct = priorCount > 0 ? Math.round(((recentCount - priorCount) / priorCount) * 100) : recentCount > 0 ? null : 0;
      return { category, recentCount, priorCount, growthPct };
    })
    .filter((entry) => entry.recentCount > 0)
    .sort((a, b) => (b.growthPct ?? 999) - (a.growthPct ?? 999));
}
