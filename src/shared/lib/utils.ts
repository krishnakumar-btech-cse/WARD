import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CatalystColumnMeta } from '../../types/catalyst-sdk';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Columns present on every Catalyst Data Store row — never user-editable, never a data column to display generically. */
export const SYSTEM_COLUMN_NAMES = new Set(['ROWID', 'CREATORID', 'CREATEDTIME', 'MODIFIEDTIME']);

/** "case_title" / "caseTitle" -> "Case Title" — used wherever a column name is shown as a label. */
export function toFieldLabel(columnName: string): string {
  return columnName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Renders an arbitrary Data Store cell value for display (list/detail views over unknown schemas). */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/**
 * Finds a column whose name matches one of the given patterns (e.g. a
 * "case id" style foreign key) without assuming its exact name — used to
 * auto-link records to the case they belong to on tables whose schema
 * isn't known ahead of time.
 */
export function findColumnByPattern(
  columns: CatalystColumnMeta[],
  patterns: RegExp[]
): CatalystColumnMeta | undefined {
  return columns.find((column) => patterns.some((pattern) => pattern.test(column.column_name)));
}

export const CASE_ID_COLUMN_PATTERNS = [/^case.?id$/i, /^caseid$/i, /case.?_?id/i];
export const STATUS_COLUMN_PATTERNS = [/^status$/i, /case.?status/i];
export const PRIORITY_COLUMN_PATTERNS = [/^priority$/i, /^severity$/i];

export type SemanticTone = 'neutral' | 'primary' | 'success' | 'warning' | 'critical';

/** Maps a status-like cell value to a badge tone by keyword, independent of the exact wording used in the real table. */
export function statusTone(value: unknown): SemanticTone {
  const v = String(value ?? '').toLowerCase();
  if (/(closed|resolved|solved|completed)/.test(v)) return 'success';
  if (/(hold|escalat|review)/.test(v)) return 'warning';
  if (/(cancel|reject|dismiss)/.test(v)) return 'critical';
  if (/(progress|active|investigat|open|assign|pending)/.test(v)) return 'primary';
  return 'neutral';
}

/** Maps a priority-like cell value to a badge tone by keyword. */
export function priorityTone(value: unknown): SemanticTone {
  const v = String(value ?? '').toLowerCase();
  if (/(critical|urgent|highest)/.test(v)) return 'critical';
  if (/high/.test(v)) return 'warning';
  if (/(medium|moderate|normal)/.test(v)) return 'primary';
  if (/low/.test(v)) return 'neutral';
  return 'neutral';
}

/** Whether a status/priority-like value represents a finished state (case closed, task done) — same keyword set as statusTone's success/critical branches. */
export function isTerminalStatus(value: unknown): boolean {
  const v = String(value ?? '').toLowerCase();
  return /(closed|resolved|solved|completed|done|cancel|reject|dismiss)/.test(v);
}

/** Whether a priority-like value counts as high-urgency (High/Critical/Urgent), independent of exact wording. */
export function isHighUrgency(value: unknown): boolean {
  const v = String(value ?? '').toLowerCase();
  return /(critical|urgent|highest|^high)/.test(v);
}

// --- Investigation Workspace canvas column patterns -------------------------
// WorkspaceItems/WorkspaceEdges schemas aren't known ahead of time either —
// the canvas resolves labels, positions, and connections the same
// pattern-matching way the rest of the app resolves case links.

export const ITEM_TYPE_COLUMN_PATTERNS = [/^item.?type$/i, /^type$/i, /^category$/i];
export const LABEL_COLUMN_PATTERNS = [/^label$/i, /^name$/i, /^title$/i, /^statement$/i];
export const POSITION_X_COLUMN_PATTERNS = [/^x$/i, /position.?x/i, /^pos.?x$/i];
export const POSITION_Y_COLUMN_PATTERNS = [/^y$/i, /position.?y/i, /^pos.?y$/i];
export const EDGE_SOURCE_COLUMN_PATTERNS = [/^from/i, /^source/i, /^start/i];
export const EDGE_TARGET_COLUMN_PATTERNS = [/^to/i, /^target/i, /^end/i];
export const RELATIONSHIP_TYPE_COLUMN_PATTERNS = [/relationship.?type/i, /^type$/i, /^label$/i];

// --- Evidence Intelligence column patterns -----------------------------------
// The real Evidence table's schema isn't known ahead of time either — these
// let the Evidence Library/Detail view surface whichever of these concepts
// the real table actually has, without assuming exact column names.

export const EVIDENCE_TITLE_COLUMN_PATTERNS = [/^title$/i, /^name$/i, /^label$/i, /evidence.?name/i];
export const FILE_KEY_COLUMN_PATTERNS = [/file.?key/i, /object.?key/i, /file.?path/i, /^attachment$/i, /file.?url/i];
export const FILE_TYPE_COLUMN_PATTERNS = [/file.?type/i, /mime.?type/i, /^type$/i, /^category$/i];
export const OCR_TEXT_COLUMN_PATTERNS = [/ocr/i, /extracted.?text/i];
export const TRANSCRIPT_COLUMN_PATTERNS = [/transcript/i, /speech.?to.?text/i];
export const AI_SUMMARY_COLUMN_PATTERNS = [/ai.?summary/i, /summary/i];
export const EVIDENCE_ID_COLUMN_PATTERNS = [/^evidence.?id$/i, /evidence.?_?id/i];

// --- Investigation Intelligence Notebook column patterns ---------------------

export const ENTRY_TYPE_COLUMN_PATTERNS = [/entry.?type/i, /^type$/i, /^category$/i];
export const CONTENT_COLUMN_PATTERNS = [/^content$/i, /^body$/i, /^notes?$/i, /^text$/i];
export const BOOKMARK_COLUMN_PATTERNS = [/bookmark/i, /^pinned$/i, /^starred$/i];
export const KEY_FINDING_COLUMN_PATTERNS = [/key.?finding/i, /is.?important/i, /highlight/i];
export const PERSON_ID_COLUMN_PATTERNS = [/person.?id/i, /suspect.?id/i, /linked.?person/i];

// --- Smart Investigation Timeline column patterns ----------------------------

export const OFFICER_NAME_COLUMN_PATTERNS = [/officer.?name/i, /assignee/i, /^name$/i];
export const EVENT_TYPE_COLUMN_PATTERNS = [/event.?type/i, /^type$/i, /^category$/i];
export const OCCURRED_AT_COLUMN_PATTERNS = [/occurred.?at/i, /^date$/i, /^timestamp$/i, /assigned.?date/i];
export const EVENT_DESCRIPTION_COLUMN_PATTERNS = [/^description$/i, /^details?$/i, /^content$/i, /^body$/i, /^notes?$/i];

// --- AI Investigation Assistant column patterns -------------------------------

export const CRIME_TYPE_COLUMN_PATTERNS = [/crime.?type/i, /offen[cs]e.?type/i, /^category$/i];
export const DISTRICT_COLUMN_PATTERNS = [/^district$/i, /^zone$/i, /^region$/i];
export const POLICE_STATION_COLUMN_PATTERNS = [/police.?station/i, /^station$/i, /^precinct$/i];
export const TASK_ASSIGNEE_COLUMN_PATTERNS = [/assigned.?to/i, /assignee/i, /^owner$/i];
export const DUE_DATE_COLUMN_PATTERNS = [/due.?date/i, /^deadline$/i];

// --- Criminal Network Intelligence column patterns ---------------------------

export const STRENGTH_COLUMN_PATTERNS = [/strength/i, /^weight$/i];
export const RISK_SCORE_COLUMN_PATTERNS = [/risk.?score/i, /^score$/i];
export const ENTITY_TYPE_COLUMN_PATTERNS = [/entity.?type/i, /^type$/i, /^category$/i];

/**
 * Catalyst timestamps come as "YYYY-MM-DD HH:mm:ss:SSS" (space-separated,
 * a non-ISO 4th colon segment for milliseconds) — this parses that format
 * for chronological sorting, falling back to a plain Date.parse for
 * anything else (e.g. a date-only column).
 */
export function parseTimestamp(value: unknown): number {
  if (!value) return 0;
  const str = String(value);
  const match = str.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?::(\d{3}))?/);
  if (match) {
    const [, date, hh, mm, ss, ms] = match;
    const parsed = Date.parse(`${date}T${hh}:${mm}:${ss}.${ms ?? '000'}`);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const fallback = Date.parse(str);
  return Number.isNaN(fallback) ? 0 : fallback;
}

