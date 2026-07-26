import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, LayoutGrid, Search, Target, Route, X, Maximize2 } from 'lucide-react';

import {
  useNetworkEntities,
  useNetworkEntitySchema,
  useCreateNetworkEntity,
  useDeleteNetworkEntity,
} from '../../hooks/useNetworkEntities';
import {
  useNetworkRelationships,
  useNetworkRelationshipSchema,
  useCreateNetworkRelationship,
  useDeleteNetworkRelationship,
} from '../../hooks/useNetworkRelationships';
import { useResolvedTable } from '../../hooks/useResolvedTable';
import { NETWORK_ENTITIES_DEMO, NETWORK_RELATIONSHIPS_DEMO } from '../../shared/lib/demoData';
import { findColumnByPattern, cn, EDGE_SOURCE_COLUMN_PATTERNS, EDGE_TARGET_COLUMN_PATTERNS } from '../../shared/lib/utils';

import { resolveNetworkGraphData, type NetworkGraphNode, type NetworkGraphEdge } from './resolveNetworkGraphData';
import { computeNetworkAutoLayout } from './networkLayout';
import { computeCentrality, findShortestPath, type PathHop } from './graphAlgorithms';
import { NetworkEntityNode, type NetworkFlowNode } from './NetworkEntityNode';
import { NetworkInspectorPanel, type NetworkSelection } from './NetworkInspectorPanel';
import { NETWORK_KIND_LABELS } from './networkNodeStyles';
import type { NetworkEntityKind } from './networkTypes';
import { DynamicForm } from '../../shared/components/DynamicForm';
import { Button } from '../../shared/components/ui/button';
import { Badge } from '../../shared/components/ui/badge';
import { Input } from '../../shared/components/ui/input';
import { FilterChip } from '../../shared/components/ui/filter-chip';
import { Skeleton } from '../../shared/components/ui/skeleton';

const nodeTypes = { networkEntity: NetworkEntityNode };

interface ContextMenuState {
  x: number;
  y: number;
  node?: NetworkGraphNode;
}

export function NetworkGraphCanvas() {
  const entities = useResolvedTable(useNetworkEntities, useNetworkEntitySchema, NETWORK_ENTITIES_DEMO);
  const relationships = useResolvedTable(useNetworkRelationships, useNetworkRelationshipSchema, NETWORK_RELATIONSHIPS_DEMO);
  const { data: entitySchema } = useNetworkEntitySchema();

  const { mutate: createEntity, isPending: isCreatingEntity, error: createEntityError } = useCreateNetworkEntity();
  const { mutate: deleteEntity } = useDeleteNetworkEntity();
  const { mutate: createRelationship } = useCreateNetworkRelationship();
  const { mutate: deleteRelationship } = useDeleteNetworkRelationship();

  const { nodes: graphNodes, edges: graphEdges } = useMemo(
    () => resolveNetworkGraphData({ entities, relationships }),
    [entities, relationships]
  );

  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});
  useEffect(() => {
    setManualPositions((prev) => {
      const missing = graphNodes.filter((n) => !prev[n.id]);
      if (missing.length === 0) return prev;
      return { ...prev, ...computeNetworkAutoLayout(missing) };
    });
  }, [graphNodes]);

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<NetworkEntityKind | null>(null);
  const [showCentral, setShowCentral] = useState(false);
  const [pathMode, setPathMode] = useState(false);
  const [pathStart, setPathStart] = useState<string | null>(null);
  const [pathEnd, setPathEnd] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [selection, setSelection] = useState<NetworkSelection>({ type: 'none' });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const availableKinds = useMemo(() => Array.from(new Set(graphNodes.map((n) => n.data.kind))), [graphNodes]);

  const centrality = useMemo(() => computeCentrality(graphNodes, graphEdges), [graphNodes, graphEdges]);
  const rankById = useMemo(() => {
    const ranked = [...centrality.values()]
      .filter((s) => s.degree > 0)
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, 5);
    const map = new Map<string, number>();
    ranked.forEach((s, i) => map.set(s.nodeId, i + 1));
    return map;
  }, [centrality]);

  const pathResult = useMemo<PathHop[] | null>(() => {
    if (!pathStart || !pathEnd) return null;
    return findShortestPath(pathStart, pathEnd, graphNodes, graphEdges);
  }, [pathStart, pathEnd, graphNodes, graphEdges]);

  const pathNodeIds = useMemo(() => new Set((pathResult ?? []).map((hop) => hop.node.id)), [pathResult]);

  // The "Expand/Collapse" feature: isolate a node and its direct neighbors.
  const focusNodeIds = useMemo(() => {
    if (!focusNodeId) return null;
    const ids = new Set<string>([focusNodeId]);
    for (const edge of graphEdges) {
      if (edge.source === focusNodeId) ids.add(edge.target);
      if (edge.target === focusNodeId) ids.add(edge.source);
    }
    return ids;
  }, [focusNodeId, graphEdges]);

  const matchesFilter = useCallback(
    (node: NetworkGraphNode) => {
      if (kindFilter && node.data.kind !== kindFilter) return false;
      if (search.trim() && !node.data.label.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    },
    [kindFilter, search]
  );

  const flowNodes = useMemo<NetworkFlowNode[]>(
    () =>
      graphNodes.map((n) => {
        const isDimmed = pathResult
          ? !pathNodeIds.has(n.id)
          : focusNodeIds
            ? !focusNodeIds.has(n.id)
            : search.trim() || kindFilter
              ? !matchesFilter(n)
              : false;
        return {
          id: n.id,
          type: 'networkEntity',
          position: manualPositions[n.id] ?? { x: 0, y: 0 },
          data: {
            ...n.data,
            rank: showCentral ? rankById.get(n.id) : undefined,
            isPathHighlighted: pathNodeIds.has(n.id),
            isDimmed,
          },
        };
      }),
    [graphNodes, manualPositions, showCentral, rankById, pathNodeIds, pathResult, focusNodeIds, search, kindFilter, matchesFilter]
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      graphEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.data.relationshipType,
        style: pathNodeIds.has(e.source) && pathNodeIds.has(e.target) ? { stroke: 'var(--color-warning)', strokeWidth: 2.5 } : undefined,
      })),
    [graphEdges, pathNodeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<NetworkFlowNode>(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(flowEdges);
  useEffect(() => setNodes(flowNodes), [flowNodes, setNodes]);
  useEffect(() => setEdges(flowEdges), [flowEdges, setEdges]);

  const onNodeDragStop = useCallback((_event: MouseEvent | TouchEvent, node: NetworkFlowNode) => {
    setManualPositions((prev) => ({ ...prev, [node.id]: node.position }));
  }, []);

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      const selectedNode = selNodes[0];
      const selectedEdge = selEdges[0];
      if (selNodes.length === 1 && selEdges.length === 0 && selectedNode) {
        const match = graphNodes.find((n) => n.id === selectedNode.id);
        setSelection(match ? { type: 'node', node: match } : { type: 'none' });
      } else if (selEdges.length === 1 && selNodes.length === 0 && selectedEdge) {
        const match = graphEdges.find((e) => e.id === selectedEdge.id);
        setSelection(match ? { type: 'edge', edge: match } : { type: 'none' });
      } else {
        setSelection({ type: 'none' });
      }
    },
    [graphNodes, graphEdges]
  );

  const onNodeClick = useCallback(
    (_event: ReactMouseEvent, node: NetworkFlowNode) => {
      if (!pathMode) return;
      if (!pathStart || (pathStart && pathEnd)) {
        setPathStart(node.id);
        setPathEnd(null);
      } else if (node.id !== pathStart) {
        setPathEnd(node.id);
      }
    },
    [pathMode, pathStart, pathEnd]
  );

  const edgeSourceColumn = useMemo(() => findColumnByPattern(relationships.columns, EDGE_SOURCE_COLUMN_PATTERNS), [relationships.columns]);
  const edgeTargetColumn = useMemo(() => findColumnByPattern(relationships.columns, EDGE_TARGET_COLUMN_PATTERNS), [relationships.columns]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (relationships.isDemo || !edgeSourceColumn || !edgeTargetColumn || !connection.source || !connection.target) {
        showNotice('Create the NetworkRelationships table (with from/to columns) to connect entities.');
        return;
      }
      const sourceNode = graphNodes.find((n) => n.id === connection.source);
      const targetNode = graphNodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;
      createRelationship({
        [edgeSourceColumn.column_name]: sourceNode.data.row.ROWID,
        [edgeTargetColumn.column_name]: targetNode.data.row.ROWID,
      });
    },
    [relationships.isDemo, edgeSourceColumn, edgeTargetColumn, graphNodes, createRelationship, showNotice]
  );

  const handleDeleteNode = useCallback(
    (node: NetworkGraphNode) => {
      if (node.data.isDemo) return;
      deleteEntity(node.data.row.ROWID as string);
      setSelection({ type: 'none' });
    },
    [deleteEntity]
  );

  const handleDeleteEdge = useCallback(
    (edge: NetworkGraphEdge) => {
      if (edge.data.isDemo) return;
      deleteRelationship(edge.data.row.ROWID as string);
      setSelection({ type: 'none' });
    },
    [deleteRelationship]
  );

  const handleFocusEntity = useCallback((nodeId: string) => {
    setSearch('');
    setKindFilter(null);
    setFocusNodeId(nodeId);
  }, []);

  const clearFocus = useCallback(() => setFocusNodeId(null), []);

  const handleSetPathEndpoint = useCallback((nodeId: string, endpoint: 'start' | 'end') => {
    setPathMode(true);
    if (endpoint === 'start') {
      setPathStart(nodeId);
    } else {
      setPathEnd(nodeId);
    }
  }, []);

  const handleAutoLayout = useCallback(() => {
    setManualPositions((prev) => ({ ...prev, ...computeNetworkAutoLayout(graphNodes) }));
  }, [graphNodes]);

  const clearPath = useCallback(() => {
    setPathStart(null);
    setPathEnd(null);
    setPathMode(false);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: NetworkFlowNode) => {
      event.preventDefault();
      const match = graphNodes.find((n) => n.id === node.id);
      setContextMenu({ x: event.clientX, y: event.clientY, node: match });
    },
    [graphNodes]
  );

  const onPaneContextMenu = useCallback((event: ReactMouseEvent | MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY });
  }, []);

  if (entities.isPending) {
    return (
      <div className="h-[70vh] rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const showSampleBadge = entities.isDemo || relationships.isDemo;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setIsAddingEntity(true)}>
          <Plus className="h-4 w-4" />
          Add entity
        </Button>
        <Button variant="outline" size="sm" onClick={handleAutoLayout}>
          <LayoutGrid className="h-4 w-4" />
          Auto layout
        </Button>
        <Button variant={showCentral ? 'secondary' : 'outline'} size="sm" onClick={() => setShowCentral((v) => !v)}>
          <Target className="h-4 w-4" />
          Central entities
        </Button>
        <Button
          variant={pathMode ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => (pathMode ? clearPath() : setPathMode(true))}
        >
          <Route className="h-4 w-4" />
          {pathMode ? 'Cancel path' : 'Find path'}
        </Button>
        {focusNodeId && (
          <Button variant="outline" size="sm" onClick={clearFocus}>
            <Maximize2 className="h-4 w-4" />
            Show full graph
          </Button>
        )}
        <div className="relative w-full max-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entities…" className="pl-9" />
        </div>
        {showSampleBadge && <Badge variant="warning">Sample data</Badge>}
        {notice && <span className="text-xs text-critical">{notice}</span>}
      </div>

      {availableKinds.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {availableKinds.map((kind) => (
            <FilterChip
              key={kind}
              label={NETWORK_KIND_LABELS[kind]}
              active={kindFilter === kind}
              onClick={() => setKindFilter((prev) => (prev === kind ? null : kind))}
            />
          ))}
        </div>
      )}

      {pathMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          <Route className="h-4 w-4 shrink-0 text-muted-foreground" />
          {!pathStart && <span className="text-muted-foreground">Click an entity to set the starting point.</span>}
          {pathStart && !pathEnd && (
            <span className="text-muted-foreground">
              Start: <strong className="text-foreground">{graphNodes.find((n) => n.id === pathStart)?.data.label}</strong> — click
              another entity to find the path.
            </span>
          )}
          {pathStart && pathEnd && pathResult && (
            <span className="text-foreground">
              {pathResult.map((hop, i) => (
                <span key={hop.node.id}>
                  {i > 0 && (
                    <span className="mx-1 text-muted-foreground">
                      —{hop.viaEdge?.data.relationshipType ? ` ${hop.viaEdge.data.relationshipType} ` : ' '}→
                    </span>
                  )}
                  <strong>{hop.node.data.label}</strong>
                </span>
              ))}
              <span className="ml-2 text-muted-foreground">({pathResult.length - 1} hop{pathResult.length === 2 ? '' : 's'})</span>
            </span>
          )}
          {pathStart && pathEnd && !pathResult && <span className="text-muted-foreground">No connection found between these entities.</span>}
          <button type="button" onClick={clearPath} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isAddingEntity && (
        <div className="rounded-lg border border-border bg-card p-4">
          {entitySchema ? (
            <DynamicForm
              columns={entitySchema}
              submitLabel="Add entity"
              isSubmitting={isCreatingEntity}
              submitError={createEntityError instanceof Error ? createEntityError.message : null}
              onCancel={() => setIsAddingEntity(false)}
              onSubmit={(values) => createEntity(values, { onSuccess: () => setIsAddingEntity(false) })}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Create the NetworkEntities table to add entities.</p>
          )}
        </div>
      )}

      <div className="relative flex h-[70vh] overflow-hidden rounded-lg border border-border">
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            nodeTypes={nodeTypes}
            deleteKeyCode={null}
            multiSelectionKeyCode="Shift"
            selectionOnDrag
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
          </ReactFlow>

          {contextMenu && (
            <div
              className="fixed z-50 min-w-[170px] rounded-md border border-border bg-card py-1 shadow-lg"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {contextMenu.node ? (
                <button
                  type="button"
                  className={cn(
                    'block w-full px-3 py-1.5 text-left text-sm text-critical hover:bg-muted',
                    contextMenu.node.data.isDemo && 'cursor-not-allowed opacity-50'
                  )}
                  disabled={contextMenu.node.data.isDemo}
                  onClick={() => handleDeleteNode(contextMenu.node!)}
                >
                  Delete
                </button>
              ) : (
                <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted" onClick={() => setIsAddingEntity(true)}>
                  Add entity
                </button>
              )}
            </div>
          )}
        </div>

        <NetworkInspectorPanel
          selection={selection}
          nodes={graphNodes}
          edges={graphEdges}
          schemas={{ entities: entities.columns, relationships: relationships.columns }}
          onFocusEntity={handleFocusEntity}
          onSetPathEndpoint={handleSetPathEndpoint}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
        />
      </div>
    </div>
  );
}
