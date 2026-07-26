import type { NetworkEntityKind } from './networkTypes';
import type { NetworkGraphNode } from './resolveNetworkGraphData';

const COLUMN_ORDER: NetworkEntityKind[] = [
  'Person',
  'Victim',
  'Witness',
  'Organization',
  'Vehicle',
  'Device',
  'Location',
  'FinancialAccount',
  'Evidence',
  'Case',
  'Other',
];

const COLUMN_WIDTH = 240;
const ROW_HEIGHT = 110;
const COLUMN_X_START = 40;
const ROW_Y_START = 40;

/** Deterministic grid layout, grouped by entity kind. */
export function computeNetworkAutoLayout(nodes: NetworkGraphNode[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const columnCounts: Partial<Record<NetworkEntityKind, number>> = {};

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
