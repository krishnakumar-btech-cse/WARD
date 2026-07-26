import { useMemo } from 'react';
import type { CatalystColumnMeta } from '../../types/catalyst-sdk';
import { Badge } from '../../shared/components/ui/badge';
import { Button } from '../../shared/components/ui/button';
import { SYSTEM_COLUMN_NAMES, toFieldLabel, formatCellValue } from '../../shared/lib/utils';
import { NETWORK_NODE_STYLES, NETWORK_KIND_LABELS } from './networkNodeStyles';
import { rankCentralEntities } from './graphAlgorithms';
import type { NetworkGraphNode, NetworkGraphEdge } from './resolveNetworkGraphData';
import type { NetworkEntityKind } from './networkTypes';

export type NetworkSelection =
  | { type: 'none' }
  | { type: 'node'; node: NetworkGraphNode }
  | { type: 'edge'; edge: NetworkGraphEdge };

export interface NetworkInspectorSchemas {
  entities: CatalystColumnMeta[];
  relationships: CatalystColumnMeta[];
}

export interface NetworkInspectorPanelProps {
  selection: NetworkSelection;
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
  schemas: NetworkInspectorSchemas;
  onFocusEntity?: (nodeId: string) => void;
  onSetPathEndpoint?: (nodeId: string, endpoint: 'start' | 'end') => void;
  onDeleteNode?: (node: NetworkGraphNode) => void;
  onDeleteEdge?: (edge: NetworkGraphEdge) => void;
}

function FieldList({ row, columns }: { row: Record<string, unknown>; columns: CatalystColumnMeta[] }) {
  const fields = columns
    .filter((c) => !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()))
    .sort((a, b) => Number(a.column_sequence ?? 0) - Number(b.column_sequence ?? 0));

  if (fields.length === 0) return null;

  return (
    <dl className="space-y-3">
      {fields.map((column) => (
        <div key={column.column_id}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{toFieldLabel(column.column_name)}</dt>
          <dd className="mt-0.5 text-sm text-foreground">{formatCellValue(row[column.column_name])}</dd>
        </div>
      ))}
    </dl>
  );
}

function Connections({ nodeId, nodes, edges }: { nodeId: string; nodes: NetworkGraphNode[]; edges: NetworkGraphEdge[] }) {
  const links = useMemo(() => {
    return edges
      .map((edge) => {
        if (edge.source === nodeId) {
          const other = nodes.find((n) => n.id === edge.target);
          return other ? { direction: 'outgoing' as const, relationshipType: edge.data.relationshipType, other } : null;
        }
        if (edge.target === nodeId) {
          const other = nodes.find((n) => n.id === edge.source);
          return other ? { direction: 'incoming' as const, relationshipType: edge.data.relationshipType, other } : null;
        }
        return null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [nodeId, nodes, edges]);

  if (links.length === 0) return <p className="text-sm text-muted-foreground">No connections yet.</p>;

  return (
    <ul className="space-y-2">
      {links.map((link, index) => {
        const style = NETWORK_NODE_STYLES[link.other.data.kind];
        const Icon = style.icon;
        return (
          <li key={index} className="flex items-center gap-2 text-sm">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{link.direction === 'outgoing' ? '→' : '←'}</span>
            <span className="truncate text-foreground">{link.other.data.label}</span>
            {link.relationshipType && (
              <Badge variant="neutral" className="ml-auto shrink-0">
                {link.relationshipType}
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function OverviewView({ nodes, edges }: { nodes: NetworkGraphNode[]; edges: NetworkGraphEdge[] }) {
  const counts = useMemo(() => {
    const byKind: Partial<Record<NetworkEntityKind, number>> = {};
    for (const node of nodes) byKind[node.data.kind] = (byKind[node.data.kind] ?? 0) + 1;
    return byKind;
  }, [nodes]);

  const central = useMemo(() => rankCentralEntities(nodes, edges, 5), [nodes, edges]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Network Overview</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {nodes.length} entit{nodes.length === 1 ? 'y' : 'ies'} · {edges.length} connection{edges.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(counts) as [NetworkEntityKind, number][]).map(([kind, count]) => {
          const style = NETWORK_NODE_STYLES[kind];
          const Icon = style.icon;
          return (
            <div key={kind} className="flex items-center gap-2 rounded-md border border-border p-2.5">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none text-foreground">{count}</p>
                <p className="truncate text-xs text-muted-foreground">{NETWORK_KIND_LABELS[kind]}</p>
              </div>
            </div>
          );
        })}
        {nodes.length === 0 && <p className="col-span-2 text-sm text-muted-foreground">No entities resolved yet.</p>}
      </div>

      {central.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Most influential entities
          </h4>
          <ol className="space-y-2">
            {central.map((entry, index) => (
              <li key={entry.node.id} className="flex items-center gap-2 text-sm">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">{entry.node.data.label}</span>
                <span className="text-xs text-muted-foreground">{entry.score.influenceScore}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            Computed from relationship count and strength — not AI-generated.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Select any entity or connection to see its details here.</p>
    </div>
  );
}

export function NetworkInspectorPanel({
  selection,
  nodes,
  edges,
  schemas,
  onFocusEntity,
  onSetPathEndpoint,
  onDeleteNode,
  onDeleteEdge,
}: NetworkInspectorPanelProps) {
  if (selection.type === 'none') {
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-card p-4">
        <OverviewView nodes={nodes} edges={edges} />
      </aside>
    );
  }

  if (selection.type === 'edge') {
    const { edge } = selection;
    const source = nodes.find((n) => n.id === edge.source);
    const target = nodes.find((n) => n.id === edge.target);
    return (
      <aside className="w-80 shrink-0 space-y-5 overflow-y-auto border-l border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Link Intelligence</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {source?.data.label ?? 'Unknown'} → {target?.data.label ?? 'Unknown'}
            </p>
          </div>
          {edge.data.relationshipType && <Badge variant="primary">{edge.data.relationshipType}</Badge>}
        </div>
        {edge.data.strength !== undefined && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Relationship strength</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${edge.data.strength}%` }} />
            </div>
          </div>
        )}
        <FieldList row={edge.data.row} columns={schemas.relationships} />
        {onDeleteEdge && !edge.data.isDemo && (
          <Button variant="destructive" size="sm" onClick={() => onDeleteEdge(edge)}>
            Delete relationship
          </Button>
        )}
      </aside>
    );
  }

  const { node } = selection;
  const style = NETWORK_NODE_STYLES[node.data.kind];
  const Icon = style.icon;

  return (
    <aside className="w-80 shrink-0 space-y-5 overflow-y-auto border-l border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${style.classes}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{NETWORK_KIND_LABELS[node.data.kind]} Profile</h3>
            <p className="text-sm text-muted-foreground">{node.data.label}</p>
          </div>
        </div>
        {node.data.isDemo && <Badge variant="warning">Sample</Badge>}
      </div>

      {node.data.riskScore !== undefined && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Risk score</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-critical" style={{ width: `${node.data.riskScore}%` }} />
          </div>
        </div>
      )}

      <FieldList row={node.data.row} columns={schemas.entities} />

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Connections</h4>
        <Connections nodeId={node.id} nodes={nodes} edges={edges} />
      </div>

      <div className="flex flex-wrap gap-2">
        {onFocusEntity && (
          <Button variant="outline" size="sm" onClick={() => onFocusEntity(node.id)}>
            Focus on this entity
          </Button>
        )}
        {onSetPathEndpoint && (
          <>
            <Button variant="outline" size="sm" onClick={() => onSetPathEndpoint(node.id, 'start')}>
              Set as path start
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSetPathEndpoint(node.id, 'end')}>
              Set as path end
            </Button>
          </>
        )}
      </div>

      {onDeleteNode && !node.data.isDemo && (
        <Button variant="destructive" size="sm" onClick={() => onDeleteNode(node)}>
          Remove entity
        </Button>
      )}
    </aside>
  );
}
