import type { CatalystRow } from '../../../types/catalyst.types';

export type CanvasNodeKind =
  | 'Evidence'
  | 'Suspect'
  | 'Victim'
  | 'Witness'
  | 'Vehicle'
  | 'Location'
  | 'Hypothesis'
  | 'Task'
  | 'Other';

export type CanvasSourceTable = 'workspaceItems' | 'caseHypotheses' | 'caseTasks';

export interface CanvasNodeData {
  kind: CanvasNodeKind;
  label: string;
  description?: string;
  sourceTable: CanvasSourceTable;
  row: CatalystRow;
  isDemo: boolean;
  [key: string]: unknown;
}

export interface CanvasEdgeData {
  relationshipType?: string;
  row: CatalystRow;
  isDemo: boolean;
  [key: string]: unknown;
}

export function inferNodeKind(itemType: string | undefined): CanvasNodeKind {
  const value = (itemType ?? '').toLowerCase();
  if (value.includes('suspect')) return 'Suspect';
  if (value.includes('victim')) return 'Victim';
  if (value.includes('witness')) return 'Witness';
  if (value.includes('vehicle')) return 'Vehicle';
  if (value.includes('location')) return 'Location';
  if (value.includes('evidence')) return 'Evidence';
  if (value.includes('hypothes')) return 'Hypothesis';
  if (value.includes('task')) return 'Task';
  return 'Other';
}
