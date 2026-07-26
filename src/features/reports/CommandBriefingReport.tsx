import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useCases, useCaseSchema } from '../../hooks/useCases';
import { useCaseTasks, useCaseTaskSchema } from '../../hooks/useCaseTasks';
import { useCaseAssignments, useCaseAssignmentSchema } from '../../hooks/useCaseAssignments';
import { useResolvedTable } from '../../hooks/useResolvedTable';
import { CASES_DEMO, CASE_TASKS_DEMO, CASE_ASSIGNMENTS_DEMO } from '../../shared/lib/demoData';
import { ReportHeader, ReportDocument, ReportDataTable } from './ReportHeader';
import { Badge } from '../../shared/components/ui/badge';
import { Button } from '../../shared/components/ui/button';
import { Skeleton } from '../../shared/components/ui/skeleton';
import { downloadCsv } from '../../shared/lib/exportCsv';
import { computeValueDistribution, computeDistrictDistribution, computeHotspots } from '../../shared/lib/computeAnalytics';
import {
  STATUS_COLUMN_PATTERNS,
  PRIORITY_COLUMN_PATTERNS,
  DISTRICT_COLUMN_PATTERNS,
  LABEL_COLUMN_PATTERNS,
  OFFICER_NAME_COLUMN_PATTERNS,
  TASK_ASSIGNEE_COLUMN_PATTERNS,
  findColumnByPattern,
  formatCellValue,
  statusTone,
  isTerminalStatus,
  isHighUrgency,
} from '../../shared/lib/utils';

/**
 * A one-page, printable counterpart to the interactive Command Intelligence
 * Dashboard (Feature 10) — the "morning briefing" someone hands to a
 * commander, not the live drill-down view.
 */
export function CommandBriefingReport() {
  const cases = useResolvedTable(useCases, useCaseSchema, CASES_DEMO);
  const tasks = useResolvedTable(useCaseTasks, useCaseTaskSchema, CASE_TASKS_DEMO);
  const assignments = useResolvedTable(useCaseAssignments, useCaseAssignmentSchema, CASE_ASSIGNMENTS_DEMO);

  const statusColumn = useMemo(() => findColumnByPattern(cases.columns, STATUS_COLUMN_PATTERNS), [cases.columns]);
  const priorityColumn = useMemo(() => findColumnByPattern(cases.columns, PRIORITY_COLUMN_PATTERNS), [cases.columns]);
  const districtColumn = useMemo(() => findColumnByPattern(cases.columns, DISTRICT_COLUMN_PATTERNS), [cases.columns]);

  const taskStatusColumn = useMemo(() => findColumnByPattern(tasks.columns, STATUS_COLUMN_PATTERNS), [tasks.columns]);
  const taskTitleColumn = useMemo(() => findColumnByPattern(tasks.columns, LABEL_COLUMN_PATTERNS), [tasks.columns]);
  const taskAssigneeColumn = useMemo(() => findColumnByPattern(tasks.columns, TASK_ASSIGNEE_COLUMN_PATTERNS), [tasks.columns]);
  const officerColumn = useMemo(() => findColumnByPattern(assignments.columns, OFFICER_NAME_COLUMN_PATTERNS), [assignments.columns]);

  const activeCases = useMemo(
    () => (statusColumn ? cases.rows.filter((r) => !isTerminalStatus(r[statusColumn.column_name])) : cases.rows),
    [cases.rows, statusColumn]
  );
  const highPriorityOpen = useMemo(
    () => (priorityColumn ? activeCases.filter((r) => isHighUrgency(r[priorityColumn.column_name])) : []),
    [activeCases, priorityColumn]
  );
  const openTasks = useMemo(
    () => (taskStatusColumn ? tasks.rows.filter((r) => !isTerminalStatus(r[taskStatusColumn.column_name])) : tasks.rows),
    [tasks.rows, taskStatusColumn]
  );

  const statusDistribution = useMemo(() => computeValueDistribution(cases.rows, statusColumn), [cases.rows, statusColumn]);
  const districtDistribution = useMemo(() => computeDistrictDistribution(cases.rows, districtColumn), [cases.rows, districtColumn]);
  const hotspots = useMemo(() => computeHotspots(districtDistribution), [districtDistribution]);
  const officerWorkload = useMemo(() => computeValueDistribution(assignments.rows, officerColumn), [assignments.rows, officerColumn]);

  const anyDemo = cases.isDemo || tasks.isDemo || assignments.isDemo;

  function exportCsv() {
    downloadCsv(
      'command-briefing-open-tasks.csv',
      [
        { key: 'title', header: 'Task' },
        { key: 'assignee', header: 'Assigned To' },
        { key: 'status', header: 'Status' },
      ],
      openTasks.map((row) => ({
        title: taskTitleColumn ? row[taskTitleColumn.column_name] : row.ROWID,
        assignee: taskAssigneeColumn ? row[taskAssigneeColumn.column_name] : '',
        status: taskStatusColumn ? row[taskStatusColumn.column_name] : '',
      }))
    );
  }

  if (cases.isPending || tasks.isPending || assignments.isPending) {
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
        title="Command Briefing Report"
        description="A printable, exportable one-pager summarizing caseload, hotspots, workload, and open tasks."
        isDemo={anyDemo}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Open Tasks CSV
          </Button>
        }
      />

      <ReportDocument title="Command Briefing" generatedNote={`Generated ${new Date().toLocaleString()}${anyDemo ? ' · Sample data' : ''}`}>
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active cases</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{activeCases.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">High-priority open</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{highPriorityOpen.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open tasks</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{openTasks.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hotspot districts</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{hotspots.filter((h) => h.isHotspot).length}</p>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Case status</h3>
          <ReportDataTable rows={statusDistribution} labelHeader="Status" />
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">District hotspots</h3>
          {hotspots.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Not enough district data yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {hotspots.slice(0, 6).map((h) => (
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
          <h3 className="text-sm font-semibold text-foreground">Officer workload</h3>
          <ReportDataTable rows={officerWorkload} labelHeader="Officer" />
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Open tasks ({openTasks.length})</h3>
          {openTasks.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No open tasks. Everything's caught up.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {openTasks.map((row) => (
                <li key={row.ROWID} className="flex items-center justify-between text-foreground">
                  <span>
                    {taskTitleColumn ? String(row[taskTitleColumn.column_name] ?? '') : row.ROWID}
                    <span className="ml-2 text-xs text-muted-foreground">{taskAssigneeColumn ? String(row[taskAssigneeColumn.column_name] ?? 'Unassigned') : ''}</span>
                  </span>
                  {taskStatusColumn && <Badge variant={statusTone(row[taskStatusColumn.column_name])}>{formatCellValue(row[taskStatusColumn.column_name])}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </ReportDocument>
    </div>
  );
}
