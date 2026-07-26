import type { CatalystRow } from '../../types/catalyst.types';
import type { ResolvedTableDisplay } from '../../shared/lib/demoData';
import {
  findColumnByPattern,
  ENTITY_TYPE_COLUMN_PATTERNS,
  LABEL_COLUMN_PATTERNS,
  EDGE_SOURCE_COLUMN_PATTERNS,
  EDGE_TARGET_COLUMN_PATTERNS,
  RELATIONSHIP_TYPE_COLUMN_PATTERNS,
  RISK_SCORE_COLUMN_PATTERNS,
  STRENGTH_COLUMN_PATTERNS,
} from '../../shared/lib/utils';
import { inferNetworkEntityKind, type NetworkNodeData, type NetworkEdgeData } from './networkTypes';

export interface NetworkGraphNode {
  id: string;
  data: NetworkNodeData;
}

export interface NetworkGraphEdge {
  id: string;
  source: string;
  target: string;
  data: NetworkEdgeData;
}

/**
 * Merges NetworkEntities + NetworkRelationships into one graph. Endpoints
 * resolve by ROWID first, falling back to matching entity names — the real
 * schema isn't known ahead of time, and the demo dataset links by name.
 */
export function resolveNetworkGraphData({
  entities,
  relationships,
}: {
  entities: ResolvedTableDisplay<CatalystRow>;
  relationships: ResolvedTableDisplay<CatalystRow>;
}): { nodes: NetworkGraphNode[]; edges: NetworkGraphEdge[] } {
  const entityTypeColumn = findColumnByPattern(entities.columns, ENTITY_TYPE_COLUMN_PATTERNS);
  const nameColumn = findColumnByPattern(entities.columns, LABEL_COLUMN_PATTERNS);
  const riskColumn = findColumnByPattern(entities.columns, RISK_SCORE_COLUMN_PATTERNS);

  const nodes: NetworkGraphNode[] = entities.rows.map((row) => {
    const kind = inferNetworkEntityKind(entityTypeColumn ? String(row[entityTypeColumn.column_name] ?? '') : undefined);
    const label = (nameColumn ? String(row[nameColumn.column_name] ?? '') : '') || `Entity ${row.ROWID}`;
    const riskValue = riskColumn ? Number(row[riskColumn.column_name]) : undefined;
    return {
      id: `networkEntities:${row.ROWID}`,
      data: {
        kind,
        label,
        riskScore: Number.isFinite(riskValue) ? riskValue : undefined,
        row,
        isDemo: entities.isDemo,
      },
    };
  });

  function resolveNodeId(value: string): string | undefined {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return undefined;
    const byRowId = nodes.find((n) => n.data.row.ROWID === value);
    if (byRowId) return byRowId.id;
    const byLabel = nodes.find((n) => n.data.label.trim().toLowerCase() === trimmed);
    return byLabel?.id;
  }

  const sourceColumn = findColumnByPattern(relationships.columns, EDGE_SOURCE_COLUMN_PATTERNS);
  const targetColumn = findColumnByPattern(relationships.columns, EDGE_TARGET_COLUMN_PATTERNS);
  const relationshipTypeColumn = findColumnByPattern(relationships.columns, RELATIONSHIP_TYPE_COLUMN_PATTERNS);
  const strengthColumn = findColumnByPattern(relationships.columns, STRENGTH_COLUMN_PATTERNS);

  const edges: NetworkGraphEdge[] = [];
  if (sourceColumn && targetColumn) {
    for (const row of relationships.rows) {
      const sourceValue = String(row[sourceColumn.column_name] ?? '');
      const targetValue = String(row[targetColumn.column_name] ?? '');
      const sourceId = resolveNodeId(sourceValue);
      const targetId = resolveNodeId(targetValue);
      if (!sourceId || !targetId) continue;
      const strengthValue = strengthColumn ? Number(row[strengthColumn.column_name]) : undefined;
      edges.push({
        id: `networkRelationships:${row.ROWID}`,
        source: sourceId,
        target: targetId,
        data: {
          relationshipType: relationshipTypeColumn ? String(row[relationshipTypeColumn.column_name] ?? '') : undefined,
          strength: Number.isFinite(strengthValue) ? strengthValue : undefined,
          row,
          isDemo: relationships.isDemo,
        },
      });
    }
  }

  return { nodes, edges };
}
