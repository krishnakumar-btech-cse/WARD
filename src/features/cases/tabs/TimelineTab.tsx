import { useMemo, useState } from 'react';
import { Search, History } from 'lucide-react';
import { useCase, useCaseSchema } from '../../../hooks/useCases';
import { useCaseAssignments, useCaseAssignmentSchema } from '../../../hooks/useCaseAssignments';
import { useEvidenceList, useEvidenceSchema } from '../../../hooks/useEvidence';
import { useNotebookEntries, useNotebookEntrySchema } from '../../../hooks/useNotebookEntries';
import { useTimelineEvents, useTimelineEventSchema, useCreateTimelineEvent } from '../../../hooks/useTimelineEvents';
import { useResolvedTable } from '../../../hooks/useResolvedTable';
import { DynamicForm } from '../../../shared/components/DynamicForm';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Input } from '../../../shared/components/ui/input';
import { Skeleton } from '../../../shared/components/ui/skeleton';
import { FilterChip } from '../../../shared/components/ui/filter-chip';
import {
  CASES_DEMO,
  CASE_ASSIGNMENTS_DEMO,
  EVIDENCE_DEMO,
  NOTEBOOK_ENTRIES_DEMO,
  TIMELINE_EVENTS_DEMO,
} from '../../../shared/lib/demoData';
import { resolveTimelineFeed, type TimelineEventKind } from './timeline/resolveTimelineFeed';
import { TIMELINE_KIND_STYLES } from './timeline/timelineStyles';
import { CASE_ID_COLUMN_PATTERNS, findColumnByPattern } from '../../../shared/lib/utils';
import type { CaseRecord } from '../../../types/case.types';

function dayLabel(ms: number): string {
  if (!ms) return 'Undated';
  const date = new Date(ms);
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function timeLabel(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * The case's chronology, assembled automatically from Case/Assignment/
 * Evidence/Notebook rows plus any status changes or manually-logged
 * updates in TimelineEvents — see resolveTimelineFeed for how the merge
 * works. Nothing here is hand-maintained; it's a read-time view over data
 * that already exists elsewhere in the case.
 */
export function TimelineTab({ caseId }: { caseId: string }) {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<TimelineEventKind | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  const isDemoCase = caseId.startsWith('demo-');
  const demoCase = isDemoCase ? (CASES_DEMO.rows.find((r) => r.ROWID === caseId) as CaseRecord | undefined) : undefined;
  const realCaseQuery = useCase(caseId);
  const realCaseSchemaQuery = useCaseSchema();
  const caseRecord = isDemoCase ? demoCase : realCaseQuery.data;

  const assignments = useResolvedTable(useCaseAssignments, useCaseAssignmentSchema, CASE_ASSIGNMENTS_DEMO);
  const evidence = useResolvedTable(useEvidenceList, useEvidenceSchema, EVIDENCE_DEMO);
  const notebook = useResolvedTable(useNotebookEntries, useNotebookEntrySchema, NOTEBOOK_ENTRIES_DEMO);
  const timelineEvents = useResolvedTable(useTimelineEvents, useTimelineEventSchema, TIMELINE_EVENTS_DEMO);
  // useTimelineEventSchema().data is typed as an array, but an
  // unauthenticated/failed request can resolve successfully with malformed
  // content instead of rejecting, so this re-validates at runtime.
  const { data: rawTimelineSchema } = useTimelineEventSchema();
  const timelineSchema = Array.isArray(rawTimelineSchema) ? rawTimelineSchema : undefined;
  const { mutate: logEvent, isPending: isSavingEvent, error: logError } = useCreateTimelineEvent();

  const isLoading =
    (!isDemoCase && (realCaseQuery.isPending || realCaseSchemaQuery.isPending)) ||
    assignments.isPending ||
    evidence.isPending ||
    notebook.isPending ||
    timelineEvents.isPending;

  const events = useMemo(
    () =>
      resolveTimelineFeed({
        caseId,
        isDemoCase,
        caseRecord,
        assignments,
        evidence,
        notebook,
        timelineEvents,
      }),
    [caseId, isDemoCase, caseRecord, assignments, evidence, notebook, timelineEvents]
  );

  const availableKinds = useMemo(
    () => Array.from(new Set(events.map((e) => e.kind))) as TimelineEventKind[],
    [events]
  );

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      if (kindFilter && event.kind !== kindFilter) return false;
      if (!query) return true;
      return `${event.title} ${event.description ?? ''}`.toLowerCase().includes(query);
    });
  }, [events, search, kindFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    for (const event of filteredEvents) {
      const label = dayLabel(event.occurredAtMs);
      const bucket = map.get(label);
      if (bucket) bucket.push(event);
      else map.set(label, [event]);
    }
    return Array.from(map.entries());
  }, [filteredEvents]);

  const showsSampleData = events.some((e) => e.isDemo);
  const caseIdColumn = timelineSchema ? findColumnByPattern(timelineSchema, CASE_ID_COLUMN_PATTERNS) : undefined;

  function handleLogEvent(values: Record<string, unknown>) {
    const payload = caseIdColumn && !values[caseIdColumn.column_name] ? { ...values, [caseIdColumn.column_name]: caseId } : values;
    logEvent(payload, { onSuccess: () => setIsLogging(false) });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Timeline</h2>
            <p className="text-sm text-muted-foreground">Chronology of this case, assembled automatically.</p>
          </div>
          {showsSampleData && <Badge variant="warning">Sample data</Badge>}
        </div>
        {!isLogging && timelineSchema && (
          <Button size="sm" variant="outline" onClick={() => setIsLogging(true)}>
            Log an update
          </Button>
        )}
      </div>

      {isLogging && timelineSchema && (
        <div className="rounded-lg border border-border bg-card p-4">
          <DynamicForm
            columns={timelineSchema}
            submitLabel={isSavingEvent ? 'Saving…' : 'Log update'}
            isSubmitting={isSavingEvent}
            submitError={logError instanceof Error ? logError.message : null}
            onCancel={() => setIsLogging(false)}
            onSubmit={handleLogEvent}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search timeline…"
            className="pl-9"
            aria-label="Search timeline"
          />
        </div>
        {availableKinds.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {availableKinds.map((kind) => (
              <FilterChip
                key={kind}
                label={TIMELINE_KIND_STYLES[kind].label}
                active={kindFilter === kind}
                onClick={() => setKindFilter((prev) => (prev === kind ? null : kind))}
              />
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && filteredEvents.length === 0 && events.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No events match your search or filters.</p>
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <History className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Nothing has happened on this case yet</p>
            <p className="text-sm text-muted-foreground">Uploads, notes, and assignments will show up here automatically.</p>
          </div>
        </div>
      )}

      {!isLoading &&
        groups.map(([label, groupEvents]) => (
          <div key={label} className="space-y-3">
            <p className="sticky top-0 bg-background py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <ol className="relative space-y-4 border-l border-border pl-6">
              {groupEvents.map((event) => {
                const style = TIMELINE_KIND_STYLES[event.kind];
                const Icon = style.icon;
                return (
                  <li key={event.id} className="relative">
                    <span
                      className={`absolute -left-[29px] flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background ${style.dotClasses}`}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        {event.description && <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>}
                        {event.isDemo && (
                          <Badge variant="warning" className="mt-1.5">
                            Sample
                          </Badge>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeLabel(event.occurredAtMs)}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
    </div>
  );
}
