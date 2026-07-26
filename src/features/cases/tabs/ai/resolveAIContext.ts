import type { CatalystColumnMeta } from '../../../../types/catalyst-sdk';
import type { CatalystRow } from '../../../../types/catalyst.types';
import type { ResolvedTableDisplay } from '../../../../shared/lib/demoData';
import {
  findColumnByPattern,
  CASE_ID_COLUMN_PATTERNS,
  LABEL_COLUMN_PATTERNS,
  EVIDENCE_TITLE_COLUMN_PATTERNS,
  FILE_TYPE_COLUMN_PATTERNS,
  STATUS_COLUMN_PATTERNS,
  PRIORITY_COLUMN_PATTERNS,
  CRIME_TYPE_COLUMN_PATTERNS,
  DISTRICT_COLUMN_PATTERNS,
  EVENT_DESCRIPTION_COLUMN_PATTERNS,
  TASK_ASSIGNEE_COLUMN_PATTERNS,
} from '../../../../shared/lib/utils';
import { inferMediaKind } from '../../../../shared/lib/media';

export interface AIContextItem {
  id: string;
  title: string;
  detail?: string;
}

export interface AICaseContext {
  caseId: string;
  isDemo: boolean;
  title: string;
  crimeType?: string;
  status?: string;
  priority?: string;
  district?: string;
  description?: string;
  evidence: AIContextItem[];
  notebook: AIContextItem[];
  pendingTasks: AIContextItem[];
}

function scoped<T extends CatalystRow>(table: ResolvedTableDisplay<T>, caseId: string): T[] {
  if (table.isDemo) return table.rows;
  const caseColumn = findColumnByPattern(table.columns, CASE_ID_COLUMN_PATTERNS);
  if (!caseColumn) return table.rows;
  return table.rows.filter((row) => String(row[caseColumn.column_name] ?? '') === caseId);
}

/**
 * The grounding for every AI Analyst capability: real case fields plus
 * this case's actual evidence/notebook/task rows. Sent as request context
 * once the Function exists, and used to synthesize honestly-labeled sample
 * responses until then — so "Case Summary" talks about this case, not a
 * generic placeholder.
 */
export function resolveAIContext({
  caseId,
  isDemoCase,
  caseRecord,
  caseSchema,
  evidence,
  notebook,
  tasks,
}: {
  caseId: string;
  isDemoCase: boolean;
  caseRecord?: CatalystRow;
  caseSchema: CatalystColumnMeta[];
  evidence: ResolvedTableDisplay<CatalystRow>;
  notebook: ResolvedTableDisplay<CatalystRow>;
  tasks: ResolvedTableDisplay<CatalystRow>;
}): AICaseContext {
  const titleColumn = findColumnByPattern(caseSchema, LABEL_COLUMN_PATTERNS);
  const crimeTypeColumn = findColumnByPattern(caseSchema, CRIME_TYPE_COLUMN_PATTERNS);
  const statusColumn = findColumnByPattern(caseSchema, STATUS_COLUMN_PATTERNS);
  const priorityColumn = findColumnByPattern(caseSchema, PRIORITY_COLUMN_PATTERNS);
  const districtColumn = findColumnByPattern(caseSchema, DISTRICT_COLUMN_PATTERNS);
  const descriptionColumn = findColumnByPattern(caseSchema, EVENT_DESCRIPTION_COLUMN_PATTERNS);

  const evidenceTitleColumn = findColumnByPattern(evidence.columns, EVIDENCE_TITLE_COLUMN_PATTERNS);
  const evidenceTypeColumn = findColumnByPattern(evidence.columns, FILE_TYPE_COLUMN_PATTERNS);
  const evidenceFileKeyColumn = findColumnByPattern(evidence.columns, [/file.?key/i, /object.?key/i]);

  const notebookTitleColumn = findColumnByPattern(notebook.columns, LABEL_COLUMN_PATTERNS);

  const taskTitleColumn = findColumnByPattern(tasks.columns, LABEL_COLUMN_PATTERNS);
  const taskStatusColumn = findColumnByPattern(tasks.columns, STATUS_COLUMN_PATTERNS);
  const taskAssigneeColumn = findColumnByPattern(tasks.columns, TASK_ASSIGNEE_COLUMN_PATTERNS);

  return {
    caseId,
    isDemo: isDemoCase,
    title: caseRecord && titleColumn ? String(caseRecord[titleColumn.column_name] ?? '') : `Case ${caseId}`,
    crimeType: caseRecord && crimeTypeColumn ? String(caseRecord[crimeTypeColumn.column_name] ?? '') : undefined,
    status: caseRecord && statusColumn ? String(caseRecord[statusColumn.column_name] ?? '') : undefined,
    priority: caseRecord && priorityColumn ? String(caseRecord[priorityColumn.column_name] ?? '') : undefined,
    district: caseRecord && districtColumn ? String(caseRecord[districtColumn.column_name] ?? '') : undefined,
    description: caseRecord && descriptionColumn ? String(caseRecord[descriptionColumn.column_name] ?? '') : undefined,
    evidence: scoped(evidence, caseId).map((row) => ({
      id: row.ROWID,
      title: evidenceTitleColumn ? String(row[evidenceTitleColumn.column_name] ?? '') : `Evidence ${row.ROWID}`,
      detail: evidenceTypeColumn
        ? String(row[evidenceTypeColumn.column_name] ?? '')
        : inferMediaKind(evidenceFileKeyColumn ? String(row[evidenceFileKeyColumn.column_name] ?? '') : undefined),
    })),
    notebook: scoped(notebook, caseId).map((row) => ({
      id: row.ROWID,
      title: notebookTitleColumn ? String(row[notebookTitleColumn.column_name] ?? '') : `Entry ${row.ROWID}`,
    })),
    pendingTasks: scoped(tasks, caseId)
      .filter((row) => {
        const status = taskStatusColumn ? String(row[taskStatusColumn.column_name] ?? '').toLowerCase() : '';
        return !status.includes('complet') && !status.includes('done') && !status.includes('closed');
      })
      .map((row) => ({
        id: row.ROWID,
        title: taskTitleColumn ? String(row[taskTitleColumn.column_name] ?? '') : `Task ${row.ROWID}`,
        detail: taskAssigneeColumn ? String(row[taskAssigneeColumn.column_name] ?? '') : undefined,
      })),
  };
}
