import type { CatalystColumnMeta } from '../../../types/catalyst-sdk';
import type { CatalystRow } from '../../../types/catalyst.types';
import {
  findColumnByPattern,
  CASE_ID_COLUMN_PATTERNS,
  ITEM_TYPE_COLUMN_PATTERNS,
  LABEL_COLUMN_PATTERNS,
  EDGE_SOURCE_COLUMN_PATTERNS,
  EDGE_TARGET_COLUMN_PATTERNS,
  RELATIONSHIP_TYPE_COLUMN_PATTERNS,
  SYSTEM_COLUMN_NAMES,
} from '../../../shared/lib/utils';
import { inferNodeKind, type CanvasNodeData, type CanvasEdgeData } from './canvasTypes';

export interface ResolvedTable<T extends CatalystRow> {
  columns: CatalystColumnMeta[];
  rows: T[];
  isDemo: boolean;
}

export interface CanvasNode {
  id: string;
  data: CanvasNodeData;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  data: CanvasEdgeData;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** First non-label text/long-varchar column — used as a node's description when one exists. */
function firstTextValue(row: CatalystRow, columns: CatalystColumnMeta[], excludeColumnId?: string): string | undefined {
  const textColumn = columns.find(
    (c) =>
      c.column_id !== excludeColumnId &&
      !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()) &&
      (c.data_type.toLowerCase().includes('text') || Number(c.max_length ?? 0) > 100)
  );
  return textColumn ? String(row[textColumn.column_name] ?? '') || undefined : undefined;
}

function scopeToCase<T extends CatalystRow>(table: ResolvedTable<T>, caseId: string): T[] {
  if (table.isDemo) return table.rows;
  const caseColumn = findColumnByPattern(table.columns, CASE_ID_COLUMN_PATTERNS);
  if (!caseColumn) return table.rows;
  return table.rows.filter((row) => String(row[caseColumn.column_name] ?? '') === caseId);
}

/**
 * Merges WorkspaceItems, WorkspaceEdges, CaseHypotheses, and CaseTasks into
 * one graph. Hypotheses/Tasks stay their own tables (with their own CRUD via
 * SchemaResourcePanel) but appear on the same board as pseudo-nodes, which
 * is what "single investigation workspace" means in practice. Edge
 * endpoints are resolved by ROWID first, falling back to matching node
 * labels — the real WorkspaceEdges schema isn't known yet, and this way
 * both a proper foreign-key design and a label-based one both work.
 */
export function resolveCanvasData({
  caseId,
  items,
  edges,
  hypotheses,
  tasks,
}: {
  caseId: string;
  items: ResolvedTable<CatalystRow>;
  edges: ResolvedTable<CatalystRow>;
  hypotheses: ResolvedTable<CatalystRow>;
  tasks: ResolvedTable<CatalystRow>;
}): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = [];

  const itemTypeColumn = findColumnByPattern(items.columns, ITEM_TYPE_COLUMN_PATTERNS);
  const itemLabelColumn = findColumnByPattern(items.columns, LABEL_COLUMN_PATTERNS);
  for (const row of scopeToCase(items, caseId)) {
    const kind = inferNodeKind(itemTypeColumn ? String(row[itemTypeColumn.column_name] ?? '') : undefined);
    const label = (itemLabelColumn ? String(row[itemLabelColumn.column_name] ?? '') : '') || `Item ${row.ROWID}`;
    nodes.push({
      id: `workspaceItems:${row.ROWID}`,
      data: {
        kind,
        label,
        description: firstTextValue(row, items.columns, itemLabelColumn?.column_id),
        sourceTable: 'workspaceItems',
        row,
        isDemo: items.isDemo,
      },
    });
  }

  const hypothesisLabelColumn = findColumnByPattern(hypotheses.columns, LABEL_COLUMN_PATTERNS);
  for (const row of scopeToCase(hypotheses, caseId)) {
    const fullText = (hypothesisLabelColumn ? String(row[hypothesisLabelColumn.column_name] ?? '') : '') || `Hypothesis ${row.ROWID}`;
    nodes.push({
      id: `caseHypotheses:${row.ROWID}`,
      data: {
        kind: 'Hypothesis',
        label: truncate(fullText, 60),
        description: fullText,
        sourceTable: 'caseHypotheses',
        row,
        isDemo: hypotheses.isDemo,
      },
    });
  }

  const taskLabelColumn = findColumnByPattern(tasks.columns, LABEL_COLUMN_PATTERNS);
  for (const row of scopeToCase(tasks, caseId)) {
    const label = (taskLabelColumn ? String(row[taskLabelColumn.column_name] ?? '') : '') || `Task ${row.ROWID}`;
    nodes.push({
      id: `caseTasks:${row.ROWID}`,
      data: {
        kind: 'Task',
        label,
        description: firstTextValue(row, tasks.columns, taskLabelColumn?.column_id),
        sourceTable: 'caseTasks',
        row,
        isDemo: tasks.isDemo,
      },
    });
  }

  function resolveNodeId(value: string): string | undefined {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return undefined;
    const byRowId = nodes.find((n) => n.data.row.ROWID === value);
    if (byRowId) return byRowId.id;
    const byLabel = nodes.find((n) => n.data.label.trim().toLowerCase() === trimmed);
    return byLabel?.id;
  }

  const sourceColumn = findColumnByPattern(edges.columns, EDGE_SOURCE_COLUMN_PATTERNS);
  const targetColumn = findColumnByPattern(edges.columns, EDGE_TARGET_COLUMN_PATTERNS);
  const relationshipColumn = findColumnByPattern(edges.columns, RELATIONSHIP_TYPE_COLUMN_PATTERNS);

  const canvasEdges: CanvasEdge[] = [];
  if (sourceColumn && targetColumn) {
    for (const row of scopeToCase(edges, caseId)) {
      const sourceValue = String(row[sourceColumn.column_name] ?? '');
      const targetValue = String(row[targetColumn.column_name] ?? '');
      const sourceId = resolveNodeId(sourceValue);
      const targetId = resolveNodeId(targetValue);
      if (!sourceId || !targetId) continue;
      canvasEdges.push({
        id: `workspaceEdges:${row.ROWID}`,
        source: sourceId,
        target: targetId,
        data: {
          relationshipType: relationshipColumn ? String(row[relationshipColumn.column_name] ?? '') : undefined,
          row,
          isDemo: edges.isDemo,
        },
      });
    }
  }

  return { nodes, edges: canvasEdges };
}
