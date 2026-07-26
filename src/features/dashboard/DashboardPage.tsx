import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FolderPlus, Paperclip, FileText, RefreshCw, MapPin } from 'lucide-react';
import { useCurrentUser } from '../../hooks/useAuth';
import { useCases, useCaseSchema } from '../../hooks/useCases';
import { useCaseTasks, useCaseTaskSchema } from '../../hooks/useCaseTasks';
import { useCaseAssignments, useCaseAssignmentSchema } from '../../hooks/useCaseAssignments';
import { useEvidenceList, useEvidenceSchema } from '../../hooks/useEvidence';
import { useNotebookEntries, useNotebookEntrySchema } from '../../hooks/useNotebookEntries';
import { useTimelineEvents, useTimelineEventSchema } from '../../hooks/useTimelineEvents';
import { useResolvedTable } from '../../hooks/useResolvedTable';
import {
  CASES_DEMO,
  CASE_TASKS_DEMO,
  CASE_ASSIGNMENTS_DEMO,
  EVIDENCE_DEMO,
  NOTEBOOK_ENTRIES_DEMO,
  TIMELINE_EVENTS_DEMO,
} from '../../shared/lib/demoData';
import { Badge } from '../../shared/components/ui/badge';
import { Skeleton } from '../../shared/components/ui/skeleton';
import { Section } from '../../shared/components/ui/section';
import { buttonVariants } from '../../shared/components/ui/button';
import { StatTile } from '../../shared/components/charts/StatTile';
import { BarChart } from '../../shared/components/charts/BarChart';
import { TrendLineChart } from '../../shared/components/charts/TrendLineChart';
import {
  computeValueDistribution,
  computeDistrictDistribution,
  computeMonthlyTrend,
  computeHotspots,
} from '../../shared/lib/computeAnalytics';
import { resolveRecentActivity, type ActivityKind } from './resolveRecentActivity';
import {
  STATUS_COLUMN_PATTERNS,
  PRIORITY_COLUMN_PATTERNS,
  DISTRICT_COLUMN_PATTERNS,
  LABEL_COLUMN_PATTERNS,
  OFFICER_NAME_COLUMN_PATTERNS,
  TASK_ASSIGNEE_COLUMN_PATTERNS,
  DUE_DATE_COLUMN_PATTERNS,
  CASE_ID_COLUMN_PATTERNS,
  findColumnByPattern,
  formatCellValue,
  statusTone,
  isTerminalStatus,
  isHighUrgency,
  parseTimestamp,
  cn,
} from '../../shared/lib/utils';

const ACTIVITY_ICON: Record<ActivityKind, typeof FolderPlus> = {
  case: FolderPlus,
  evidence: Paperclip,
  notebook: FileText,
  status: RefreshCw,
};

function formatRelativeTime(ms: number): string {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function DashboardPage() {
  const { data: user } = useCurrentUser();

  const cases = useResolvedTable(useCases, useCaseSchema, CASES_DEMO);
  const tasks = useResolvedTable(useCaseTasks, useCaseTaskSchema, CASE_TASKS_DEMO);
  const assignments = useResolvedTable(useCaseAssignments, useCaseAssignmentSchema, CASE_ASSIGNMENTS_DEMO);
  const evidence = useResolvedTable(useEvidenceList, useEvidenceSchema, EVIDENCE_DEMO);
  const notebook = useResolvedTable(useNotebookEntries, useNotebookEntrySchema, NOTEBOOK_ENTRIES_DEMO);
  const timelineEvents = useResolvedTable(useTimelineEvents, useTimelineEventSchema, TIMELINE_EVENTS_DEMO);

  const isPending = cases.isPending || tasks.isPending || assignments.isPending || evidence.isPending || notebook.isPending || timelineEvents.isPending;
  const isDemo = cases.isDemo || tasks.isDemo || assignments.isDemo || evidence.isDemo || notebook.isDemo || timelineEvents.isDemo;

  const statusColumn = useMemo(() => findColumnByPattern(cases.columns, STATUS_COLUMN_PATTERNS), [cases.columns]);
  const priorityColumn = useMemo(() => findColumnByPattern(cases.columns, PRIORITY_COLUMN_PATTERNS), [cases.columns]);
  const districtColumn = useMemo(() => findColumnByPattern(cases.columns, DISTRICT_COLUMN_PATTERNS), [cases.columns]);
  const caseTitleColumn = useMemo(() => findColumnByPattern(cases.columns, LABEL_COLUMN_PATTERNS), [cases.columns]);

  const taskStatusColumn = useMemo(() => findColumnByPattern(tasks.columns, STATUS_COLUMN_PATTERNS), [tasks.columns]);
  const taskTitleColumn = useMemo(() => findColumnByPattern(tasks.columns, LABEL_COLUMN_PATTERNS), [tasks.columns]);
  const taskAssigneeColumn = useMemo(() => findColumnByPattern(tasks.columns, TASK_ASSIGNEE_COLUMN_PATTERNS), [tasks.columns]);
  const taskDueDateColumn = useMemo(() => findColumnByPattern(tasks.columns, DUE_DATE_COLUMN_PATTERNS), [tasks.columns]);
  const taskCaseColumn = useMemo(() => findColumnByPattern(tasks.columns, CASE_ID_COLUMN_PATTERNS), [tasks.columns]);

  const officerColumn = useMemo(() => findColumnByPattern(assignments.columns, OFFICER_NAME_COLUMN_PATTERNS), [assignments.columns]);

  const activeCases = useMemo(
    () => (statusColumn ? cases.rows.filter((r) => !isTerminalStatus(r[statusColumn.column_name])) : cases.rows),
    [cases.rows, statusColumn]
  );
  const highPriorityOpen = useMemo(() => {
    if (!priorityColumn) return [];
    return activeCases.filter((r) => isHighUrgency(r[priorityColumn.column_name]));
  }, [activeCases, priorityColumn]);
  const openTasks = useMemo(
    () => (taskStatusColumn ? tasks.rows.filter((r) => !isTerminalStatus(r[taskStatusColumn.column_name])) : tasks.rows),
    [tasks.rows, taskStatusColumn]
  );
  const overdueTasks = useMemo(() => {
    if (!taskDueDateColumn) return [];
    return openTasks.filter((r) => {
      const dueMs = parseTimestamp(r[taskDueDateColumn.column_name]);
      return dueMs > 0 && dueMs < Date.now();
    });
  }, [openTasks, taskDueDateColumn]);

  const statusDistribution = useMemo(() => computeValueDistribution(cases.rows, statusColumn), [cases.rows, statusColumn]);
  const priorityDistribution = useMemo(() => computeValueDistribution(cases.rows, priorityColumn), [cases.rows, priorityColumn]);
  const monthlyTrend = useMemo(() => computeMonthlyTrend(cases.rows), [cases.rows]);
  const districtDistribution = useMemo(() => computeDistrictDistribution(cases.rows, districtColumn), [cases.rows, districtColumn]);
  const hotspots = useMemo(() => computeHotspots(districtDistribution), [districtDistribution]);
  const officerWorkload = useMemo(() => computeValueDistribution(assignments.rows, officerColumn), [assignments.rows, officerColumn]);
  const taskStatusDistribution = useMemo(() => computeValueDistribution(tasks.rows, taskStatusColumn), [tasks.rows, taskStatusColumn]);

  const thisMonth = monthlyTrend[monthlyTrend.length - 1]?.value ?? 0;
  const lastMonth = monthlyTrend[monthlyTrend.length - 2]?.value ?? 0;
  const monthDelta = thisMonth - lastMonth;

  const caseTitleByRowId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of cases.rows) {
      map.set(row.ROWID, caseTitleColumn ? String(row[caseTitleColumn.column_name] ?? '') : row.ROWID);
    }
    return map;
  }, [cases.rows, caseTitleColumn]);

  const oldestOpenTasks = useMemo(
    () => [...openTasks].sort((a, b) => parseTimestamp(a.CREATEDTIME) - parseTimestamp(b.CREATEDTIME)).slice(0, 6),
    [openTasks]
  );

  const recentActivity = useMemo(
    () => resolveRecentActivity({ cases, evidence, notebook, timelineEvents, limit: 8 }),
    [cases, evidence, notebook, timelineEvents]
  );

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Command Intelligence Dashboard{user ? ` — Welcome back, ${user.first_name}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground">
              Organization-wide caseload, workload, and activity across {cases.rows.length} case{cases.rows.length === 1 ? '' : 's'}.
            </p>
          </div>
          {isDemo && <Badge variant="warning">Sample data</Badge>}
        </div>
        <Link to="/cases/new" className={cn(buttonVariants({ variant: 'primary' }))}>
          New case
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active cases" value={String(activeCases.length)} deltaLabel={`of ${cases.rows.length} total`} />
        <StatTile
          label="High-priority open"
          value={String(highPriorityOpen.length)}
          deltaLabel={highPriorityOpen.length > 0 ? 'Needs attention' : undefined}
          deltaDirection={highPriorityOpen.length > 0 ? 'up' : undefined}
          goodDirection="down"
        />
        <StatTile
          label="Open tasks"
          value={String(openTasks.length)}
          deltaLabel={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : undefined}
          deltaDirection={overdueTasks.length > 0 ? 'up' : undefined}
          goodDirection="down"
        />
        <StatTile
          label="New this month"
          value={String(thisMonth)}
          deltaLabel={`${monthDelta >= 0 ? '+' : ''}${monthDelta} vs last month`}
          deltaDirection={monthDelta > 0 ? 'up' : monthDelta < 0 ? 'down' : 'flat'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Case status">
          <BarChart data={statusDistribution} />
        </Section>
        <Section title="Case priority">
          <BarChart data={priorityDistribution} />
        </Section>
      </div>

      <Section title="Case volume" description="New cases opened, last 6 months.">
        <TrendLineChart data={monthlyTrend} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="District hotspots" description={`Districts at or above ${'>'}1.3× the average case count.`}>
          {hotspots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough district data yet.</p>
          ) : (
            <ul className="space-y-2">
              {hotspots.slice(0, 6).map((h) => (
                <li key={h.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {h.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{h.count} cases</span>
                    {h.isHotspot && <Badge variant="critical">Hotspot</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Officer workload" description="Cases currently assigned, per officer.">
          <BarChart data={officerWorkload} emptyMessage="No assignments recorded yet." />
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Task status">
          <BarChart data={taskStatusDistribution} emptyMessage="No tasks recorded yet." />
        </Section>

        <Section title="Open tasks" description="Oldest first — what's been sitting the longest.">
          {oldestOpenTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks. Everything's caught up.</p>
          ) : (
            <ul className="space-y-3">
              {oldestOpenTasks.map((task) => {
                const title = taskTitleColumn ? String(task[taskTitleColumn.column_name] ?? '') : `Task ${task.ROWID}`;
                const assignee = taskAssigneeColumn ? String(task[taskAssigneeColumn.column_name] ?? '') : '';
                const status = taskStatusColumn ? task[taskStatusColumn.column_name] : undefined;
                const caseId = taskCaseColumn ? String(task[taskCaseColumn.column_name] ?? '') : undefined;
                const caseLabel = caseId ? caseTitleByRowId.get(caseId) : undefined;
                const dueMs = taskDueDateColumn ? parseTimestamp(task[taskDueDateColumn.column_name]) : 0;
                const isOverdue = dueMs > 0 && dueMs < Date.now();
                return (
                  <li key={task.ROWID} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground" title={title}>
                        {title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {assignee || 'Unassigned'}
                        {caseLabel ? ` · ${caseLabel}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isOverdue && <Badge variant="critical">Overdue</Badge>}
                      {status !== undefined && <Badge variant={statusTone(status)}>{formatCellValue(status)}</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Recent activity" description="Latest events across every case, newest first.">
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentActivity.map((event) => {
              const Icon = ACTIVITY_ICON[event.kind];
              return (
                <li key={event.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      {event.caseId ? (
                        <Link to={`/cases/${event.caseId}`} className="text-primary hover:underline">
                          {event.title}
                        </Link>
                      ) : (
                        event.title
                      )}
                    </p>
                    {event.description && <p className="truncate text-xs text-muted-foreground">{event.description}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(event.occurredAtMs)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
