import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase, useCases, useCaseSchema, useDeleteCase, useUpdateCase } from '../../../hooks/useCases';
import { useTimelineEventSchema, useCreateTimelineEvent, useTimelineEvents } from '../../../hooks/useTimelineEvents';
import {
  useCaseAssignments,
  useCaseAssignmentSchema,
  useCreateCaseAssignment,
  useDeleteCaseAssignment,
} from '../../../hooks/useCaseAssignments';
import { useEvidenceList, useEvidenceSchema } from '../../../hooks/useEvidence';
import { useNotebookEntries, useNotebookEntrySchema } from '../../../hooks/useNotebookEntries';
import { useResolvedTable } from '../../../hooks/useResolvedTable';
import { DynamicForm } from '../../../shared/components/DynamicForm';
import { SchemaResourcePanel } from '../../../shared/components/SchemaResourcePanel';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Skeleton } from '../../../shared/components/ui/skeleton';
import {
  CASES_DEMO,
  CASE_ASSIGNMENTS_DEMO,
  EVIDENCE_DEMO,
  NOTEBOOK_ENTRIES_DEMO,
  TIMELINE_EVENTS_DEMO,
} from '../../../shared/lib/demoData';
import { resolveTimelineFeed } from './timeline/resolveTimelineFeed';
import { TIMELINE_KIND_STYLES } from './timeline/timelineStyles';
import {
  SYSTEM_COLUMN_NAMES,
  STATUS_COLUMN_PATTERNS,
  PRIORITY_COLUMN_PATTERNS,
  CASE_ID_COLUMN_PATTERNS,
  EVENT_TYPE_COLUMN_PATTERNS,
  EVENT_DESCRIPTION_COLUMN_PATTERNS,
  OCCURRED_AT_COLUMN_PATTERNS,
  formatCellValue,
  toFieldLabel,
  findColumnByPattern,
  statusTone,
  priorityTone,
} from '../../../shared/lib/utils';
import type { CaseRecord } from '../../../types/case.types';

export function OverviewTab({ caseId, onViewTimeline }: { caseId: string; onViewTimeline: () => void }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const isDemoCase = caseId.startsWith('demo-');
  const demoCase = isDemoCase ? (CASES_DEMO.rows.find((r) => r.ROWID === caseId) as CaseRecord | undefined) : undefined;

  const realCaseQuery = useCase(caseId);
  const realSchemaQuery = useCaseSchema();
  const { data: allCases } = useCases();

  const caseRecord = isDemoCase ? demoCase : realCaseQuery.data;
  // realSchemaQuery.data is typed as an array, but an unauthenticated/failed
  // request can resolve successfully with malformed content instead of
  // rejecting, so this re-validates at runtime rather than trusting the type.
  const schema = isDemoCase ? CASES_DEMO.schema : Array.isArray(realSchemaQuery.data) ? realSchemaQuery.data : undefined;
  const isPending = !isDemoCase && (realCaseQuery.isPending || realSchemaQuery.isPending);
  const isError = !isDemoCase && (realCaseQuery.isError || !caseRecord);

  const { mutate: updateCase, isPending: isUpdating, error: updateError } = useUpdateCase();
  const { mutate: deleteCase, isPending: isDeleting } = useDeleteCase();
  const { data: timelineSchema, isError: isTimelineSchemaError } = useTimelineEventSchema();
  const { mutate: logTimelineEvent } = useCreateTimelineEvent();

  const statusColumn = schema ? findColumnByPattern(schema, STATUS_COLUMN_PATTERNS) : undefined;
  const priorityColumn = schema ? findColumnByPattern(schema, PRIORITY_COLUMN_PATTERNS) : undefined;

  // allCases?.content is typed as an array, but it's ultimately an external
  // API response — a failed/unauthenticated request can resolve with a
  // malformed non-array payload instead of rejecting, so this re-validates
  // at runtime rather than trusting the type.
  const casePool = Array.isArray(allCases?.content) ? allCases.content : isDemoCase ? CASES_DEMO.rows : [];

  const statusOptions = useMemo(() => {
    if (!statusColumn) return [];
    return Array.from(new Set(casePool.map((r) => String(r[statusColumn.column_name] ?? '')).filter(Boolean)));
  }, [casePool, statusColumn]);

  const priorityOptions = useMemo(() => {
    if (!priorityColumn) return [];
    return Array.from(new Set(casePool.map((r) => String(r[priorityColumn.column_name] ?? '')).filter(Boolean)));
  }, [casePool, priorityColumn]);

  // Same chronology the Timeline tab builds — this just shows the 5 most recent.
  const assignments = useResolvedTable(useCaseAssignments, useCaseAssignmentSchema, CASE_ASSIGNMENTS_DEMO);
  const evidence = useResolvedTable(useEvidenceList, useEvidenceSchema, EVIDENCE_DEMO);
  const notebook = useResolvedTable(useNotebookEntries, useNotebookEntrySchema, NOTEBOOK_ENTRIES_DEMO);
  const timelineEvents = useResolvedTable(useTimelineEvents, useTimelineEventSchema, TIMELINE_EVENTS_DEMO);
  const recentActivity = useMemo(
    () =>
      resolveTimelineFeed({ caseId, isDemoCase, caseRecord, assignments, evidence, notebook, timelineEvents }).slice(0, 5),
    [caseId, isDemoCase, caseRecord, assignments, evidence, notebook, timelineEvents]
  );

  if (isPending) {
    return (
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !caseRecord) {
    return <p className="text-sm text-critical">This case could not be found.</p>;
  }

  const displayColumns = (schema ?? [])
    .filter((c) => !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()))
    .sort((a, b) => Number(a.column_sequence ?? 0) - Number(b.column_sequence ?? 0));

  function handleDelete() {
    if (isDemoCase) return;
    if (!window.confirm('Delete this case? This cannot be undone.')) return;
    deleteCase(caseId, { onSuccess: () => navigate('/cases') });
  }

  function handleQuickChange(fieldLabel: string, columnName: string, value: string) {
    if (isDemoCase || !caseRecord) return;
    const previousValue = String(caseRecord[columnName] ?? 'Not set');
    updateCase({ ROWID: caseRecord.ROWID, [columnName]: value });

    // Status/priority are the one thing a single MODIFIEDTIME can't tell the
    // timeline ("what changed") — log it explicitly, only when there's a
    // real TimelineEvents table to log it to.
    const canLog = Array.isArray(timelineSchema) && !isTimelineSchemaError;
    if (canLog) {
      const eventTypeColumn = findColumnByPattern(timelineSchema, EVENT_TYPE_COLUMN_PATTERNS);
      const descriptionColumn = findColumnByPattern(timelineSchema, EVENT_DESCRIPTION_COLUMN_PATTERNS);
      const occurredAtColumn = findColumnByPattern(timelineSchema, OCCURRED_AT_COLUMN_PATTERNS);
      const timelineCaseColumn = findColumnByPattern(timelineSchema, CASE_ID_COLUMN_PATTERNS);
      if (eventTypeColumn) {
        logTimelineEvent({
          [eventTypeColumn.column_name]: `${fieldLabel} Change`,
          ...(descriptionColumn ? { [descriptionColumn.column_name]: `${fieldLabel} changed from ${previousValue} to ${value}.` } : {}),
          ...(occurredAtColumn ? { [occurredAtColumn.column_name]: new Date().toISOString() } : {}),
          ...(timelineCaseColumn ? { [timelineCaseColumn.column_name]: caseId } : {}),
        });
      }
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Created {formatCellValue(caseRecord.CREATEDTIME)} · Last updated {formatCellValue(caseRecord.MODIFIEDTIME)}
          </p>
          {isDemoCase && <Badge variant="warning">Sample data</Badge>}
        </div>
        {!isEditing && !isDemoCase && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        )}
      </div>

      {(statusColumn || priorityColumn) && (
        <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-card p-4">
          {statusColumn && (
            <QuickField
              label="Status"
              value={String(caseRecord[statusColumn.column_name] ?? '')}
              options={statusOptions}
              tone={statusTone}
              disabled={isDemoCase || isUpdating}
              onChange={(value) => handleQuickChange('Status', statusColumn.column_name, value)}
            />
          )}
          {priorityColumn && (
            <QuickField
              label="Priority"
              value={String(caseRecord[priorityColumn.column_name] ?? '')}
              options={priorityOptions}
              tone={priorityTone}
              disabled={isDemoCase || isUpdating}
              onChange={(value) => handleQuickChange('Priority', priorityColumn.column_name, value)}
            />
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        {isEditing && schema ? (
          <DynamicForm
            columns={schema}
            initialValues={caseRecord}
            submitLabel="Save changes"
            isSubmitting={isUpdating}
            submitError={updateError instanceof Error ? updateError.message : null}
            onCancel={() => setIsEditing(false)}
            onSubmit={(values) => updateCase({ ...values, ROWID: caseRecord.ROWID }, { onSuccess: () => setIsEditing(false) })}
          />
        ) : (
          <dl className="space-y-4">
            {displayColumns
              .filter((c) => c.column_id !== statusColumn?.column_id && c.column_id !== priorityColumn?.column_id)
              .map((column) => (
                <div key={column.column_id}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {toFieldLabel(column.column_name)}
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">{formatCellValue(caseRecord[column.column_name])}</dd>
                </div>
              ))}
          </dl>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <SchemaResourcePanel
          title="Assignment"
          description="Officers assigned to this case."
          emptyMessage="No one is assigned to this case yet."
          linkColumnPatterns={CASE_ID_COLUMN_PATTERNS}
          linkValue={caseId}
          demoDataset={CASE_ASSIGNMENTS_DEMO}
          hooks={{
            useList: useCaseAssignments,
            useSchema: useCaseAssignmentSchema,
            useCreate: useCreateCaseAssignment,
            useRemove: useDeleteCaseAssignment,
          }}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Recent activity</h2>
          <button type="button" onClick={onViewTimeline} className="text-sm font-medium text-primary hover:underline">
            View full timeline
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentActivity.map((event) => {
              const style = TIMELINE_KIND_STYLES[event.kind];
              const Icon = style.icon;
              return (
                <li key={event.id} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${style.dotClasses}`}>
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-foreground">
                      {event.title}
                      {event.isDemo && (
                        <Badge variant="warning" className="ml-2">
                          Sample
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCellValue(event.occurredAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function QuickField({
  label,
  value,
  options,
  tone,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  tone: (value: unknown) => 'neutral' | 'primary' | 'success' | 'warning' | 'critical';
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const allOptions = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="relative">
        <Badge variant={tone(value)} className="pr-6">
          {value || 'Not set'}
        </Badge>
        <select
          aria-label={`Change ${label.toLowerCase()}`}
          value={value}
          disabled={disabled || allOptions.length === 0}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        >
          {allOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
