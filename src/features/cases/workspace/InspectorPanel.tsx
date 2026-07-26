import { useMemo } from 'react';
import type { CatalystColumnMeta } from '../../../types/catalyst-sdk';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import {
  SYSTEM_COLUMN_NAMES,
  STATUS_COLUMN_PATTERNS,
  toFieldLabel,
  formatCellValue,
  findColumnByPattern,
  statusTone,
} from '../../../shared/lib/utils';
import { NODE_STYLES } from './nodeStyles';
import type { CanvasNode, CanvasEdge } from './resolveCanvasData';
import type { CanvasNodeKind } from './canvasTypes';

export type InspectorSelection =
  | { type: 'none' }
  | { type: 'node'; node: CanvasNode }
  | { type: 'edge'; edge: CanvasEdge };

export interface InspectorSchemas {
  items: CatalystColumnMeta[];
  hypotheses: CatalystColumnMeta[];
  tasks: CatalystColumnMeta[];
  edges: CatalystColumnMeta[];
}

export interface InspectorPanelProps {
  selection: InspectorSelection;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  schemas: InspectorSchemas;
  onDeleteNode?: (node: CanvasNode) => void;
  onDeleteEdge?: (edge: CanvasEdge) => void;
}

const KIND_TO_VIEW_TITLE: Record<CanvasNodeKind, string> = {
  Evidence: 'Evidence Intelligence',
  Suspect: 'Criminal Profile',
  Victim: 'Criminal Profile',
  Witness: 'Criminal Profile',
  Vehicle: 'Vehicle Intelligence',
  Location: 'Geographic Intelligence',
  Task: 'Investigation Progress',
  Hypothesis: 'Hypothesis Detail',
  Other: 'Details',
};

function schemaFor(node: CanvasNode, schemas: InspectorSchemas): CatalystColumnMeta[] {
  if (node.data.sourceTable === 'workspaceItems') return schemas.items;
  if (node.data.sourceTable === 'caseHypotheses') return schemas.hypotheses;
  return schemas.tasks;
}

function FieldList({ row, columns }: { row: Record<string, unknown>; columns: CatalystColumnMeta[] }) {
  const fields = columns
    .filter((c) => !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()))
    .sort((a, b) => Number(a.column_sequence ?? 0) - Number(b.column_sequence ?? 0));

  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">No additional fields.</p>;
  }

  return (
    <dl className="space-y-3">
      {fields.map((column) => (
        <div key={column.column_id}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {toFieldLabel(column.column_name)}
          </dt>
          <dd className="mt-0.5 text-sm text-foreground">{formatCellValue(row[column.column_name])}</dd>
        </div>
      ))}
    </dl>
  );
}

function Connections({ nodeId, nodes, edges }: { nodeId: string; nodes: CanvasNode[]; edges: CanvasEdge[] }) {
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

  if (links.length === 0) {
    return <p className="text-sm text-muted-foreground">No connections yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {links.map((link, index) => {
        const style = NODE_STYLES[link.other.data.kind];
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

function OverviewView({ nodes, edges }: { nodes: CanvasNode[]; edges: CanvasEdge[] }) {
  const counts = useMemo(() => {
    const byKind: Partial<Record<CanvasNodeKind, number>> = {};
    for (const node of nodes) {
      byKind[node.data.kind] = (byKind[node.data.kind] ?? 0) + 1;
    }
    return byKind;
  }, [nodes]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Investigation Overview</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {nodes.length} item{nodes.length === 1 ? '' : 's'} · {edges.length} connection{edges.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(counts) as [CanvasNodeKind, number][]).map(([kind, count]) => {
          const style = NODE_STYLES[kind];
          const Icon = style.icon;
          return (
            <div key={kind} className="flex items-center gap-2 rounded-md border border-border p-2.5">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none text-foreground">{count}</p>
                <p className="truncate text-xs text-muted-foreground">{kind}</p>
              </div>
            </div>
          );
        })}
        {nodes.length === 0 && (
          <p className="col-span-2 text-sm text-muted-foreground">
            Nothing on the board yet. Add an item to get started.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Select any item or connection to see its details here.</p>
    </div>
  );
}

export function InspectorPanel({ selection, nodes, edges, schemas, onDeleteNode, onDeleteEdge }: InspectorPanelProps) {
  if (selection.type === 'none') {
    return (
      <aside className="w-80 shrink-0 border-l border-border bg-card p-4">
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
        <FieldList row={edge.data.row} columns={schemas.edges} />
        {onDeleteEdge && !edge.data.isDemo && (
          <Button variant="destructive" size="sm" onClick={() => onDeleteEdge(edge)}>
            Delete relationship
          </Button>
        )}
      </aside>
    );
  }

  const { node } = selection;
  const columns = schemaFor(node, schemas);
  const style = NODE_STYLES[node.data.kind];
  const Icon = style.icon;

  return (
    <aside className="w-80 shrink-0 space-y-5 overflow-y-auto border-l border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${style.classes}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{KIND_TO_VIEW_TITLE[node.data.kind]}</h3>
            <p className="text-sm text-muted-foreground">{node.data.label}</p>
          </div>
        </div>
        {node.data.isDemo && <Badge variant="warning">Sample</Badge>}
      </div>

      {node.data.kind === 'Task' &&
        (() => {
          const statusColumn = findColumnByPattern(columns, STATUS_COLUMN_PATTERNS);
          const value = statusColumn ? node.data.row[statusColumn.column_name] : undefined;
          return value ? <Badge variant={statusTone(value)}>{formatCellValue(value)}</Badge> : null;
        })()}

      <FieldList row={node.data.row} columns={columns} />

      {(node.data.kind === 'Suspect' ||
        node.data.kind === 'Victim' ||
        node.data.kind === 'Witness' ||
        node.data.kind === 'Vehicle' ||
        node.data.kind === 'Location' ||
        node.data.kind === 'Evidence') && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Connections</h4>
          <Connections nodeId={node.id} nodes={nodes} edges={edges} />
        </div>
      )}

      {onDeleteNode && !node.data.isDemo && (
        <Button variant="destructive" size="sm" onClick={() => onDeleteNode(node)}>
          Remove from board
        </Button>
      )}
    </aside>
  );
}
