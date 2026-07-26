import { useMemo } from 'react';
import { useCases, useCaseSchema } from '../../hooks/useCases';
import { useResolvedTable } from '../../hooks/useResolvedTable';
import { useCrimePatternAggregates, useCrimePatternAggregateSchema } from '../../hooks/useCrimePatterns';
import { SchemaResourcePanel } from '../../shared/components/SchemaResourcePanel';
import { Badge } from '../../shared/components/ui/badge';
import { Skeleton } from '../../shared/components/ui/skeleton';
import { Section } from '../../shared/components/ui/section';
import { StatTile } from '../../shared/components/charts/StatTile';
import { BarChart } from '../../shared/components/charts/BarChart';
import { TrendLineChart } from '../../shared/components/charts/TrendLineChart';
import { HeatMatrix } from '../../shared/components/charts/HeatMatrix';
import { Sparkline } from '../../shared/components/charts/Sparkline';
import { categoricalColor } from '../../shared/components/charts/chartPalette';
import { AnalyticsInsightCard } from './AnalyticsInsightCard';
import { sampleModusOperandiInsight, sampleRepeatOffenderInsight, samplePredictiveInsight } from './sampleAnalyticsInsights';
import {
  computeCategoryDistribution,
  computeDistrictDistribution,
  computeStationDistribution,
  computeMonthlyTrend,
  computeWeeklyTrend,
  computeTimeOfDayDistribution,
  computeCrimeHeatMatrix,
  computeHotspots,
  computeRiskIndicators,
  computeEmergingCategories,
} from '../../shared/lib/computeAnalytics';
import { CASES_DEMO, CRIME_PATTERN_AGGREGATES_DEMO } from '../../shared/lib/demoData';
import { CRIME_TYPE_COLUMN_PATTERNS, DISTRICT_COLUMN_PATTERNS, POLICE_STATION_COLUMN_PATTERNS, PRIORITY_COLUMN_PATTERNS, findColumnByPattern } from '../../shared/lib/utils';

export function CrimePatternAnalyticsPage() {
  const cases = useResolvedTable(useCases, useCaseSchema, CASES_DEMO);

  const crimeTypeColumn = useMemo(() => findColumnByPattern(cases.columns, CRIME_TYPE_COLUMN_PATTERNS), [cases.columns]);
  const districtColumn = useMemo(() => findColumnByPattern(cases.columns, DISTRICT_COLUMN_PATTERNS), [cases.columns]);
  const stationColumn = useMemo(() => findColumnByPattern(cases.columns, POLICE_STATION_COLUMN_PATTERNS), [cases.columns]);
  const priorityColumn = useMemo(() => findColumnByPattern(cases.columns, PRIORITY_COLUMN_PATTERNS), [cases.columns]);

  const categoryDistribution = useMemo(() => computeCategoryDistribution(cases.rows, crimeTypeColumn), [cases.rows, crimeTypeColumn]);
  const districtDistribution = useMemo(() => computeDistrictDistribution(cases.rows, districtColumn), [cases.rows, districtColumn]);
  const stationDistribution = useMemo(() => computeStationDistribution(cases.rows, stationColumn), [cases.rows, stationColumn]);
  const monthlyTrend = useMemo(() => computeMonthlyTrend(cases.rows), [cases.rows]);
  const weeklyTrend = useMemo(() => computeWeeklyTrend(cases.rows), [cases.rows]);
  const timeOfDay = useMemo(() => computeTimeOfDayDistribution(cases.rows), [cases.rows]);
  const heatMatrix = useMemo(
    () => computeCrimeHeatMatrix(cases.rows, districtColumn, crimeTypeColumn),
    [cases.rows, districtColumn, crimeTypeColumn]
  );
  const hotspots = useMemo(() => computeHotspots(districtDistribution), [districtDistribution]);
  const riskIndicators = useMemo(
    () => computeRiskIndicators(cases.rows, districtColumn, priorityColumn),
    [cases.rows, districtColumn, priorityColumn]
  );
  const emerging = useMemo(
    () => computeEmergingCategories(cases.rows, crimeTypeColumn, 30),
    [cases.rows, crimeTypeColumn]
  );

  const topCategory = categoryDistribution.length > 0 ? [...categoryDistribution].sort((a, b) => b.value - a.value)[0] : undefined;
  const topHotspot = hotspots.find((h) => h.isHotspot) ?? hotspots[0];
  const thisMonth = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0;
  const lastMonth = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0;
  const monthDelta = thisMonth - lastMonth;

  if (cases.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Crime Pattern Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Computed from {cases.rows.length} case record{cases.rows.length === 1 ? '' : 's'} — refreshes as cases change.
          </p>
        </div>
        {cases.isDemo && <Badge variant="warning">Sample data</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total cases" value={String(cases.rows.length)} />
        <StatTile
          label="This month"
          value={String(thisMonth)}
          deltaLabel={`${monthDelta >= 0 ? '+' : ''}${monthDelta} vs last month`}
          deltaDirection={monthDelta > 0 ? 'up' : monthDelta < 0 ? 'down' : 'flat'}
          goodDirection="down"
        />
        <StatTile label="Leading category" value={topCategory?.label ?? '—'} deltaLabel={topCategory ? `${topCategory.value} cases` : undefined} />
        <StatTile label="Hotspot district" value={topHotspot?.label ?? '—'} deltaLabel={topHotspot?.isHotspot ? 'Above average volume' : undefined} deltaDirection={topHotspot?.isHotspot ? 'up' : undefined} goodDirection="down" />
      </div>

      <Section title="Crime heatmap" description="District × category intensity — darker means more cases.">
        <HeatMatrix rows={heatMatrix.rows} columns={heatMatrix.columns} values={heatMatrix.values} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Crime category distribution">
          <BarChart data={categoryDistribution} />
        </Section>
        <Section title="District comparison" description="Location intelligence — case volume by district.">
          <BarChart data={districtDistribution} />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Police station comparison">
          <BarChart data={stationDistribution} />
        </Section>
        <Section title="Time-of-day analysis" description="By case-registration hour — a proxy for incident timing.">
          <BarChart data={timeOfDay} valueFormatter={String} maxItems={6} />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Monthly trend" description="Crime trends / timeline analysis, last 6 months.">
          <TrendLineChart data={monthlyTrend} />
        </Section>
        <Section title="Weekly trend" description="Last 8 weeks.">
          <TrendLineChart data={weeklyTrend} />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Hotspot detection" description={`Districts at or above ${'>'}1.3× the average case count.`}>
          {hotspots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough district data yet.</p>
          ) : (
            <ul className="space-y-2">
              {hotspots.slice(0, 6).map((h) => (
                <li key={h.label} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{h.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{h.count} cases</span>
                    {h.isHotspot && <Badge variant="critical">Hotspot</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Risk indicators" description="Case volume weighted by high-priority share, per district.">
          {riskIndicators.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data yet.</p>
          ) : (
            <ul className="space-y-3">
              {riskIndicators.map((r) => (
                <li key={r.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{r.label}</span>
                    <span className="text-muted-foreground">{r.riskScore}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-critical" style={{ width: `${r.riskScore}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Emerging crime detection" description="Case volume in the last 30 days vs the 30 days before — a trend signal, not a forecast.">
        {emerging.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough historical data yet to compare periods.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {emerging.slice(0, 4).map((e, index) => (
              <div key={e.category} className="rounded-md border border-border p-3">
                <p className="truncate text-sm font-medium text-foreground" title={e.category}>
                  {e.category}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.recentCount} recent {e.growthPct !== null && <span>({e.growthPct >= 0 ? '+' : ''}{e.growthPct}%)</span>}
                </p>
                <div className="mt-2">
                  <Sparkline data={[e.priorCount, e.recentCount]} color={categoricalColor(index)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="AI-powered insights" description="These need pattern-matching or forecasting beyond plain aggregation — generated on demand.">
        <div className="grid gap-4 md:grid-cols-3">
          <AnalyticsInsightCard
            title="Modus operandi analysis"
            description="Recurring methods within the leading crime category."
            action="modus-operandi-analysis"
            sample={sampleModusOperandiInsight(categoryDistribution)}
          />
          <AnalyticsInsightCard
            title="Repeat offender analysis"
            description="People appearing across multiple cases."
            action="repeat-offender-analysis"
            sample={sampleRepeatOffenderInsight()}
          />
          <AnalyticsInsightCard
            title="Predictive crime insights"
            description="Near-term volume forecast by category and district."
            action="predictive-crime-insights"
            sample={samplePredictiveInsight(emerging)}
          />
        </div>
      </Section>

      <SchemaResourcePanel
        title="Precomputed aggregates"
        description="Rows written by a scheduled analytics job, once one exists."
        emptyMessage="No precomputed aggregates yet."
        readOnly
        maxColumns={8}
        demoDataset={CRIME_PATTERN_AGGREGATES_DEMO}
        hooks={{
          useList: useCrimePatternAggregates,
          useSchema: useCrimePatternAggregateSchema,
        }}
      />
    </div>
  );
}
