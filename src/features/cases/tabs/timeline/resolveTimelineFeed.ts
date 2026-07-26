import type { CatalystRow } from '../../../../types/catalyst.types';
import type { ResolvedTableDisplay } from '../../../../shared/lib/demoData';
import { scopeToCase as scoped } from '../../../../shared/lib/scopeToCase';
import {
  findColumnByPattern,
  EVIDENCE_TITLE_COLUMN_PATTERNS,
  LABEL_COLUMN_PATTERNS,
  OFFICER_NAME_COLUMN_PATTERNS,
  EVENT_TYPE_COLUMN_PATTERNS,
  OCCURRED_AT_COLUMN_PATTERNS,
  EVENT_DESCRIPTION_COLUMN_PATTERNS,
  parseTimestamp,
} from '../../../../shared/lib/utils';

const STATUS_CHANGE_KEYWORDS = [/status/i, /priority/i];

export type TimelineEventKind = 'case' | 'assignment' | 'evidence' | 'notebook' | 'status' | 'update';

export interface TimelineFeedEvent {
  id: string;
  kind: TimelineEventKind;
  title: string;
  description?: string;
  occurredAt: string;
  occurredAtMs: number;
  isDemo: boolean;
}

/**
 * Builds the case's chronology by reading straight from data that already
 * exists — case/assignment/evidence/notebook rows all carry their own
 * CREATEDTIME — rather than requiring every feature to remember to also
 * write a timeline row. Status/priority changes are the one thing a single
 * MODIFIEDTIME can't reconstruct ("what changed"), so those are written
 * explicitly at the point of change (see OverviewTab) and read back here
 * from TimelineEvents alongside any other manually logged entries.
 */
export function resolveTimelineFeed({
  caseId,
  isDemoCase,
  caseRecord,
  assignments,
  evidence,
  notebook,
  timelineEvents,
}: {
  caseId: string;
  isDemoCase: boolean;
  caseRecord?: CatalystRow;
  assignments: ResolvedTableDisplay<CatalystRow>;
  evidence: ResolvedTableDisplay<CatalystRow>;
  notebook: ResolvedTableDisplay<CatalystRow>;
  timelineEvents: ResolvedTableDisplay<CatalystRow>;
}): TimelineFeedEvent[] {
  const events: TimelineFeedEvent[] = [];

  if (caseRecord) {
    events.push({
      id: `case:${caseRecord.ROWID}`,
      kind: 'case',
      title: 'Case registered',
      occurredAt: String(caseRecord.CREATEDTIME ?? ''),
      occurredAtMs: parseTimestamp(caseRecord.CREATEDTIME),
      isDemo: isDemoCase,
    });
  }

  const officerColumn = findColumnByPattern(assignments.columns, OFFICER_NAME_COLUMN_PATTERNS);
  const roleColumn = findColumnByPattern(assignments.columns, [/^role$/i]);
  const assignedDateColumn = findColumnByPattern(assignments.columns, OCCURRED_AT_COLUMN_PATTERNS);
  for (const row of scoped(assignments, caseId)) {
    const officer = officerColumn ? String(row[officerColumn.column_name] ?? '') : 'An officer';
    const role = roleColumn ? String(row[roleColumn.column_name] ?? '') : '';
    const occurredAt = String((assignedDateColumn ? row[assignedDateColumn.column_name] : undefined) ?? row.CREATEDTIME ?? '');
    events.push({
      id: `assignment:${row.ROWID}`,
      kind: 'assignment',
      title: role ? `${officer} assigned as ${role}` : `${officer} assigned to this case`,
      occurredAt,
      occurredAtMs: parseTimestamp(occurredAt),
      isDemo: assignments.isDemo,
    });
  }

  const evidenceTitleColumn = findColumnByPattern(evidence.columns, EVIDENCE_TITLE_COLUMN_PATTERNS);
  for (const row of scoped(evidence, caseId)) {
    const title = evidenceTitleColumn ? String(row[evidenceTitleColumn.column_name] ?? '') : `Evidence ${row.ROWID}`;
    events.push({
      id: `evidence:${row.ROWID}`,
      kind: 'evidence',
      title: `Evidence uploaded: ${title}`,
      occurredAt: String(row.CREATEDTIME ?? ''),
      occurredAtMs: parseTimestamp(row.CREATEDTIME),
      isDemo: evidence.isDemo,
    });
  }

  const notebookTitleColumn = findColumnByPattern(notebook.columns, LABEL_COLUMN_PATTERNS);
  for (const row of scoped(notebook, caseId)) {
    const title = notebookTitleColumn ? String(row[notebookTitleColumn.column_name] ?? '') : `Entry ${row.ROWID}`;
    events.push({
      id: `notebook:${row.ROWID}`,
      kind: 'notebook',
      title: `Notebook entry: ${title}`,
      occurredAt: String(row.CREATEDTIME ?? ''),
      occurredAtMs: parseTimestamp(row.CREATEDTIME),
      isDemo: notebook.isDemo,
    });
  }

  const eventTypeColumn = findColumnByPattern(timelineEvents.columns, EVENT_TYPE_COLUMN_PATTERNS);
  const descriptionColumn = findColumnByPattern(timelineEvents.columns, EVENT_DESCRIPTION_COLUMN_PATTERNS);
  const occurredAtColumn = findColumnByPattern(timelineEvents.columns, OCCURRED_AT_COLUMN_PATTERNS);
  for (const row of scoped(timelineEvents, caseId)) {
    const eventType = eventTypeColumn ? String(row[eventTypeColumn.column_name] ?? '') : '';
    const description = descriptionColumn ? String(row[descriptionColumn.column_name] ?? '') : '';
    const occurredAt = String((occurredAtColumn ? row[occurredAtColumn.column_name] : undefined) ?? row.CREATEDTIME ?? '');
    const isStatusChange = STATUS_CHANGE_KEYWORDS.some((pattern) => pattern.test(eventType));
    events.push({
      id: `timeline:${row.ROWID}`,
      kind: isStatusChange ? 'status' : 'update',
      title: eventType || 'Case update',
      description: description || undefined,
      occurredAt,
      occurredAtMs: parseTimestamp(occurredAt),
      isDemo: timelineEvents.isDemo,
    });
  }

  return events.sort((a, b) => b.occurredAtMs - a.occurredAtMs);
}
