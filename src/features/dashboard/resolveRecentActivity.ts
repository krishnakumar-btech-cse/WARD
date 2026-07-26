import type { CatalystRow } from '../../types/catalyst.types';
import type { ResolvedTableDisplay } from '../../shared/lib/demoData';
import {
  findColumnByPattern,
  CASE_ID_COLUMN_PATTERNS,
  LABEL_COLUMN_PATTERNS,
  EVIDENCE_TITLE_COLUMN_PATTERNS,
  EVENT_TYPE_COLUMN_PATTERNS,
  OCCURRED_AT_COLUMN_PATTERNS,
  EVENT_DESCRIPTION_COLUMN_PATTERNS,
  parseTimestamp,
} from '../../shared/lib/utils';

export type ActivityKind = 'case' | 'evidence' | 'notebook' | 'status';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  description?: string;
  caseId?: string;
  caseLabel?: string;
  occurredAt: string;
  occurredAtMs: number;
  isDemo: boolean;
}

/**
 * Org-wide counterpart to the per-case resolveTimelineFeed: same idea (read
 * activity straight from each table's own CREATEDTIME rather than requiring
 * a separate write-through log) but scanning every case instead of one, and
 * resolving each event's CaseId back to a case label so the dashboard can
 * link out to it.
 */
export function resolveRecentActivity({
  cases,
  evidence,
  notebook,
  timelineEvents,
  limit = 8,
}: {
  cases: ResolvedTableDisplay<CatalystRow>;
  evidence: ResolvedTableDisplay<CatalystRow>;
  notebook: ResolvedTableDisplay<CatalystRow>;
  timelineEvents: ResolvedTableDisplay<CatalystRow>;
  limit?: number;
}): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  const caseTitleColumn = findColumnByPattern(cases.columns, LABEL_COLUMN_PATTERNS);
  const caseById = new Map(cases.rows.map((row) => [row.ROWID, row]));
  function resolveCase(caseId: string | undefined): { caseId?: string; caseLabel?: string } {
    if (!caseId) return {};
    const row = caseById.get(caseId);
    if (!row) return { caseId };
    const label = caseTitleColumn ? String(row[caseTitleColumn.column_name] ?? '') : undefined;
    return { caseId, caseLabel: label || undefined };
  }

  for (const row of cases.rows) {
    const title = caseTitleColumn ? String(row[caseTitleColumn.column_name] ?? '') : `Case ${row.ROWID}`;
    events.push({
      id: `case:${row.ROWID}`,
      kind: 'case',
      title: `Case registered: ${title}`,
      caseId: row.ROWID,
      caseLabel: title || undefined,
      occurredAt: String(row.CREATEDTIME ?? ''),
      occurredAtMs: parseTimestamp(row.CREATEDTIME),
      isDemo: cases.isDemo,
    });
  }

  const evidenceCaseColumn = findColumnByPattern(evidence.columns, CASE_ID_COLUMN_PATTERNS);
  const evidenceTitleColumn = findColumnByPattern(evidence.columns, EVIDENCE_TITLE_COLUMN_PATTERNS);
  for (const row of evidence.rows) {
    const title = evidenceTitleColumn ? String(row[evidenceTitleColumn.column_name] ?? '') : `Evidence ${row.ROWID}`;
    const caseId = evidenceCaseColumn ? String(row[evidenceCaseColumn.column_name] ?? '') : undefined;
    events.push({
      id: `evidence:${row.ROWID}`,
      kind: 'evidence',
      title: `Evidence uploaded: ${title}`,
      ...resolveCase(caseId),
      occurredAt: String(row.CREATEDTIME ?? ''),
      occurredAtMs: parseTimestamp(row.CREATEDTIME),
      isDemo: evidence.isDemo,
    });
  }

  const notebookCaseColumn = findColumnByPattern(notebook.columns, CASE_ID_COLUMN_PATTERNS);
  const notebookTitleColumn = findColumnByPattern(notebook.columns, LABEL_COLUMN_PATTERNS);
  for (const row of notebook.rows) {
    const title = notebookTitleColumn ? String(row[notebookTitleColumn.column_name] ?? '') : `Entry ${row.ROWID}`;
    const caseId = notebookCaseColumn ? String(row[notebookCaseColumn.column_name] ?? '') : undefined;
    events.push({
      id: `notebook:${row.ROWID}`,
      kind: 'notebook',
      title: `Notebook entry: ${title}`,
      ...resolveCase(caseId),
      occurredAt: String(row.CREATEDTIME ?? ''),
      occurredAtMs: parseTimestamp(row.CREATEDTIME),
      isDemo: notebook.isDemo,
    });
  }

  const timelineCaseColumn = findColumnByPattern(timelineEvents.columns, CASE_ID_COLUMN_PATTERNS);
  const eventTypeColumn = findColumnByPattern(timelineEvents.columns, EVENT_TYPE_COLUMN_PATTERNS);
  const descriptionColumn = findColumnByPattern(timelineEvents.columns, EVENT_DESCRIPTION_COLUMN_PATTERNS);
  const occurredAtColumn = findColumnByPattern(timelineEvents.columns, OCCURRED_AT_COLUMN_PATTERNS);
  for (const row of timelineEvents.rows) {
    const eventType = eventTypeColumn ? String(row[eventTypeColumn.column_name] ?? '') : 'Case update';
    const description = descriptionColumn ? String(row[descriptionColumn.column_name] ?? '') : undefined;
    const caseId = timelineCaseColumn ? String(row[timelineCaseColumn.column_name] ?? '') : undefined;
    const occurredAt = String((occurredAtColumn ? row[occurredAtColumn.column_name] : undefined) ?? row.CREATEDTIME ?? '');
    events.push({
      id: `timeline:${row.ROWID}`,
      kind: 'status',
      title: eventType || 'Case update',
      description: description || undefined,
      ...resolveCase(caseId),
      occurredAt,
      occurredAtMs: parseTimestamp(occurredAt),
      isDemo: timelineEvents.isDemo,
    });
  }

  return events.sort((a, b) => b.occurredAtMs - a.occurredAtMs).slice(0, limit);
}
