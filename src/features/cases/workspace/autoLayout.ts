import type { CanvasNodeKind } from './canvasTypes';
import type { CanvasNode } from './resolveCanvasData';

const COLUMN_ORDER: CanvasNodeKind[] = [
  'Suspect',
  'Victim',
  'Witness',
  'Vehicle',
  'Location',
  'Evidence',
  'Hypothesis',
  'Task',
  'Other',
];

const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 120;
const COLUMN_X_START = 40;
const ROW_Y_START = 40;

/** Deterministic grid layout, grouped by entity kind — the "Auto Layout" action. */
export function computeAutoLayout(nodes: CanvasNode[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const columnCounts: Partial<Record<CanvasNodeKind, number>> = {};

  for (const node of nodes) {
    const kind = node.data.kind;
    const columnIndex = COLUMN_ORDER.indexOf(kind);
    const row = columnCounts[kind] ?? 0;
    columnCounts[kind] = row + 1;

    positions[node.id] = {
      x: COLUMN_X_START + (columnIndex < 0 ? COLUMN_ORDER.length : columnIndex) * COLUMN_WIDTH,
      y: ROW_Y_START + row * ROW_HEIGHT,
    };
  }

  return positions;
}
