import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useCases, useCaseSchema } from '../../hooks/useCases';
import { useResolvedTable } from '../../hooks/useResolvedTable';
import { CASES_DEMO } from '../../shared/lib/demoData';
import { ReportHeader, ReportDocument, ReportDataTable } from './ReportHeader';
import { Badge } from '../../shared/components/ui/badge';
import { Button } from '../../shared/components/ui/button';
import { Skeleton } from '../../shared/components/ui/skeleton';
import { downloadCsv } from '../../shared/lib/exportCsv';
import { computeCategoryDistribution, computeDistrictDistribution, computeHotspots, computeMonthlyTrend } from '../../shared/lib/computeAnalytics';
import { CRIME_TYPE_COLUMN_PATTERNS, DISTRICT_COLUMN_PATTERNS, findColumnByPattern, isTerminalStatus, STATUS_COLUMN_PATTERNS } from '../../shared/lib/utils';

/**
 * A one-page, precise summary companion to the full interactive Crime
 * Pattern Analytics dashboard (Feature 09) — tables, not charts, since the
 * job here is "print/export the exact figures," not "explore the data."
 */
export function CrimePatternReport() {
  const cases = useResolvedTable(useCases, useCaseSchema, CASES_DEMO);

  const crimeTypeColumn = useMemo(() => findColumnByPattern(cases.columns, CRIME_TYPE_COLUMN_PATTERNS), [cases.columns]);
  const districtColumn = useMemo(() => findColumnByPattern(cases.columns, DISTRICT_COLUMN_PATTERNS), [cases.columns]);
  const statusColumn = useMemo(() => findColumnByPattern(cases.columns, STATUS_COLUMN_PATTERNS), [cases.columns]);

  const categoryDistribution = useMemo(() => computeCategoryDistribution(cases.rows, crimeTypeColumn), [cases.rows, crimeTypeColumn]);
  const districtDistribution = useMemo(() => computeDistrictDistribution(cases.rows, districtColumn), [cases.rows, districtColumn]);
  const hotspots = useMemo(() => computeHotspots(districtDistribution), [districtDistribution]);
  const monthlyTrend = useMemo(() => computeMonthlyTrend(cases.rows), [cases.rows]);

  const activeCases = useMemo(
    () => (statusColumn ? cases.rows.filter((r) => !isTerminalStatus(r[statusColumn.column_name])) : cases.rows),
    [cases.rows, statusColumn]
  );
  const topCategory = categoryDistribution.length > 0 ? [...categoryDistribution].sort((a, b) => b.value - a.value)[0] : undefined;
  const topHotspot = hotspots.find((h) => h.isHotspot);

  function exportCsv() {
    downloadCsv(
      'crime-pattern-summary.csv',
      [
        { key: 'dimension', header: 'Dimension' },
        { key: 'label', header: 'Label' },
        { key: 'count', header: 'Cases' },
      ],
      [
        ...categoryDistribution.map((d) => ({ dimension: 'Category', label: d.label, count: d.value })),
        ...districtDistribution.map((d) => ({ dimension: 'District', label: d.label, count: d.value })),
      ]
    );
  }

  if (cases.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Crime Pattern Summary Report"
        description="A printable, exportable snapshot of category, district, and trend figures — the precise numbers behind the Crime Patterns dashboard."
        isDemo={cases.isDemo}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <ReportDocument title="Crime Pattern Summary" generatedNote={`Generated ${new Date().toLocaleString()}${cases.isDemo ? ' · Sample data' : ''}`}>
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total cases</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{cases.rows.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active cases</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{activeCases.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Leading category</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{topCategory?.label ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hotspot district</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{topHotspot?.label ?? 'None flagged'}</p>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Crime category distribution</h3>
          <ReportDataTable rows={categoryDistribution} />
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">District distribution</h3>
          <ReportDataTable rows={districtDistribution} labelHeader="District" />
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Hotspot districts</h3>
          {hotspots.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Not enough district data yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {hotspots.map((h) => (
                <li key={h.label} className="flex items-center justify-between text-foreground">
                  <span>{h.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{h.count} cases</span>
                    {h.isHotspot && <Badge variant="critical">Hotspot</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Monthly trend (last 6 months)</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                {monthlyTrend.map((point) => (
                  <th key={point.label} className="py-1.5 text-center font-medium">{point.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {monthlyTrend.map((point) => (
                  <td key={point.label} className="py-1.5 text-center font-medium text-foreground">{point.value}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>
      </ReportDocument>
    </div>
  );
}
