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
import { Plus, LayoutGrid, Undo2, Redo2 } from 'lucide-react';

import {
  useWorkspaceItems,
  useWorkspaceItemSchema,
  useCreateWorkspaceItem,
  useUpdateWorkspaceItem,
  useDeleteWorkspaceItem,
} from '../../../hooks/useWorkspaceItems';
import {
  useWorkspaceEdges,
  useWorkspaceEdgeSchema,
  useCreateWorkspaceEdge,
  useDeleteWorkspaceEdge,
} from '../../../hooks/useWorkspaceEdges';
import { useHypotheses, useHypothesisSchema, useCreateHypothesis, useDeleteHypothesis } from '../../../hooks/useHypotheses';
import { useCaseTasks, useCaseTaskSchema, useCreateCaseTask, useDeleteCaseTask } from '../../../hooks/useCaseTasks';

import {
  resolveTableDisplay,
  WORKSPACE_ITEMS_DEMO,
  WORKSPACE_EDGES_DEMO,
  CASE_HYPOTHESES_DEMO,
  CASE_TASKS_DEMO,
} from '../../../shared/lib/demoData';
import { env } from '../../../utils/env';
import {
  findColumnByPattern,
  cn,
  CASE_ID_COLUMN_PATTERNS,
  POSITION_X_COLUMN_PATTERNS,
  POSITION_Y_COLUMN_PATTERNS,
  EDGE_SOURCE_COLUMN_PATTERNS,
  EDGE_TARGET_COLUMN_PATTERNS,
} from '../../../shared/lib/utils';

import { resolveCanvasData, type CanvasNode, type CanvasEdge } from './resolveCanvasData';
import { computeAutoLayout } from './autoLayout';
import { EntityNode, type EntityFlowNode } from './EntityNode';
import { InspectorPanel, type InspectorSelection } from './InspectorPanel';
import { useUndoRedo } from './useUndoRedo';
import { DynamicForm } from '../../../shared/components/DynamicForm';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Skeleton } from '../../../shared/components/ui/skeleton';

const nodeTypes = { entity: EntityNode };

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
}

interface ContextMenuState {
  x: number;
  y: number;
  node?: CanvasNode;
}

export function WorkspaceCanvas({ caseId }: { caseId: string }) {
  const fallbackEnabled = env.features.enableSampleDataFallback;

  const itemsList = useWorkspaceItems();
  const itemsSchema = useWorkspaceItemSchema();
  const itemsResolved = useMemo(
    () =>
      resolveTableDisplay({
        schema: itemsSchema.data,
        schemaIsError: itemsSchema.isError,
        realRows: itemsList.data?.content ?? [],
        listSettled: !itemsList.isPending,
        demoDataset: WORKSPACE_ITEMS_DEMO,
        fallbackEnabled,
      }),
    [itemsSchema.data, itemsSchema.isError, itemsList.data, itemsList.isPending, fallbackEnabled]
  );

  const edgesList = useWorkspaceEdges();
  const edgesSchema = useWorkspaceEdgeSchema();
  const edgesResolved = useMemo(
    () =>
      resolveTableDisplay({
        schema: edgesSchema.data,
        schemaIsError: edgesSchema.isError,
        realRows: edgesList.data?.content ?? [],
        listSettled: !edgesList.isPending,
        demoDataset: WORKSPACE_EDGES_DEMO,
        fallbackEnabled,
      }),
    [edgesSchema.data, edgesSchema.isError, edgesList.data, edgesList.isPending, fallbackEnabled]
  );

  const hypothesesList = useHypotheses();
  const hypothesesSchema = useHypothesisSchema();
  const hypothesesResolved = useMemo(
    () =>
      resolveTableDisplay({
        schema: hypothesesSchema.data,
        schemaIsError: hypothesesSchema.isError,
        realRows: hypothesesList.data?.content ?? [],
        listSettled: !hypothesesList.isPending,
        demoDataset: CASE_HYPOTHESES_DEMO,
        fallbackEnabled,
      }),
    [hypothesesSchema.data, hypothesesSchema.isError, hypothesesList.data, hypothesesList.isPending, fallbackEnabled]
  );

  const tasksList = useCaseTasks();
  const tasksSchema = useCaseTaskSchema();
  const tasksResolved = useMemo(
    () =>
      resolveTableDisplay({
        schema: tasksSchema.data,
        schemaIsError: tasksSchema.isError,
        realRows: tasksList.data?.content ?? [],
        listSettled: !tasksList.isPending,
        demoDataset: CASE_TASKS_DEMO,
        fallbackEnabled,
      }),
    [tasksSchema.data, tasksSchema.isError, tasksList.data, tasksList.isPending, fallbackEnabled]
  );

  const isLoading = itemsList.isPending || itemsSchema.isPending;

  const { nodes: canvasNodes, edges: canvasEdges } = useMemo(
    () => resolveCanvasData({ caseId, items: itemsResolved, edges: edgesResolved, hypotheses: hypothesesResolved, tasks: tasksResolved }),
    [caseId, itemsResolved, edgesResolved, hypothesesResolved, tasksResolved]
  );

  const positionColumnX = useMemo(() => findColumnByPattern(itemsResolved.columns, POSITION_X_COLUMN_PATTERNS), [itemsResolved.columns]);
  const positionColumnY = useMemo(() => findColumnByPattern(itemsResolved.columns, POSITION_Y_COLUMN_PATTERNS), [itemsResolved.columns]);
  const edgeSourceColumn = useMemo(() => findColumnByPattern(edgesResolved.columns, EDGE_SOURCE_COLUMN_PATTERNS), [edgesResolved.columns]);
  const edgeTargetColumn = useMemo(() => findColumnByPattern(edgesResolved.columns, EDGE_TARGET_COLUMN_PATTERNS), [edgesResolved.columns]);

  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});

  const storedPosition = useCallback(
    (node: CanvasNode): { x: number; y: number } | undefined => {
      if (node.data.sourceTable !== 'workspaceItems' || !positionColumnX || !positionColumnY) return undefined;
      const x = Number(node.data.row[positionColumnX.column_name]);
      const y = Number(node.data.row[positionColumnY.column_name]);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
    },
    [positionColumnX, positionColumnY]
  );

  // Auto-layout any node that has neither a stored nor a previously-assigned position.
  useEffect(() => {
    setManualPositions((prev) => {
      const missing = canvasNodes.filter((n) => !storedPosition(n) && !prev[n.id]);
      if (missing.length === 0) return prev;
      return { ...prev, ...computeAutoLayout(missing) };
    });
  }, [canvasNodes, storedPosition]);

  const initialFlowNodes = useMemo<EntityFlowNode[]>(
    () =>
      canvasNodes.map((n) => ({
        id: n.id,
        type: 'entity',
        position: storedPosition(n) ?? manualPositions[n.id] ?? { x: 0, y: 0 },
        data: n.data,
      })),
    [canvasNodes, manualPositions, storedPosition]
  );

  const initialFlowEdges = useMemo<Edge[]>(
    () =>
      canvasEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.data.relationshipType,
        data: e.data,
      })),
    [canvasEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<EntityFlowNode>(initialFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialFlowEdges);

  useEffect(() => setNodes(initialFlowNodes), [initialFlowNodes, setNodes]);
  useEffect(() => setEdges(initialFlowEdges), [initialFlowEdges, setEdges]);

  const [selection, setSelection] = useState<InspectorSelection>({ type: 'none' });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  const { mutate: createItem, isPending: isCreatingItem, error: createItemError } = useCreateWorkspaceItem();
  const { mutate: updateItem } = useUpdateWorkspaceItem();
  const { mutate: deleteItem } = useDeleteWorkspaceItem();
  const { mutate: createEdgeRow } = useCreateWorkspaceEdge();
  const { mutate: deleteEdgeRow } = useDeleteWorkspaceEdge();
  const { mutate: createHypothesis } = useCreateHypothesis();
  const { mutate: deleteHypothesis } = useDeleteHypothesis();
  const { mutate: createTask } = useCreateCaseTask();
  const { mutate: deleteTask } = useDeleteCaseTask();

  const { push: pushUndo, undo, redo, canUndo, canRedo } = useUndoRedo();

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      const selectedNode = selNodes[0];
      const selectedEdge = selEdges[0];
      if (selNodes.length === 1 && selEdges.length === 0 && selectedNode) {
        const match = canvasNodes.find((n) => n.id === selectedNode.id);
        setSelection(match ? { type: 'node', node: match } : { type: 'none' });
      } else if (selEdges.length === 1 && selNodes.length === 0 && selectedEdge) {
        const match = canvasEdges.find((e) => e.id === selectedEdge.id);
        setSelection(match ? { type: 'edge', edge: match } : { type: 'none' });
      } else {
        setSelection({ type: 'none' });
      }
    },
    [canvasNodes, canvasEdges]
  );

  const handleNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: EntityFlowNode) => {
      const canvasNode = canvasNodes.find((n) => n.id === node.id);
      if (!canvasNode) return;
      const prevPos = storedPosition(canvasNode) ?? manualPositions[node.id] ?? { x: 0, y: 0 };
      const newPos = node.position;
      if (prevPos.x === newPos.x && prevPos.y === newPos.y) return;

      const applyPosition = (pos: { x: number; y: number }) => {
        if (canvasNode.data.sourceTable === 'workspaceItems' && positionColumnX && positionColumnY && !canvasNode.data.isDemo) {
          updateItem({ ROWID: canvasNode.data.row.ROWID as string, [positionColumnX.column_name]: pos.x, [positionColumnY.column_name]: pos.y });
        } else {
          setManualPositions((prev) => ({ ...prev, [node.id]: pos }));
        }
      };

      applyPosition(newPos);
      pushUndo({ label: 'Move', undo: () => applyPosition(prevPos), redo: () => applyPosition(newPos) });
    },
    [canvasNodes, manualPositions, positionColumnX, positionColumnY, storedPosition, updateItem, pushUndo]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (edgesResolved.isDemo || !edgeSourceColumn || !edgeTargetColumn || !connection.source || !connection.target) {
        showNotice('Create the WorkspaceEdges table (with from/to columns) to connect items.');
        return;
      }
      const sourceNode = canvasNodes.find((n) => n.id === connection.source);
      const targetNode = canvasNodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      createEdgeRow({
        [edgeSourceColumn.column_name]: sourceNode.data.row.ROWID,
        [edgeTargetColumn.column_name]: targetNode.data.row.ROWID,
      });
    },
    [edgesResolved.isDemo, edgeSourceColumn, edgeTargetColumn, canvasNodes, createEdgeRow, showNotice]
  );

  const handleDeleteNode = useCallback(
    (node: CanvasNode) => {
      if (node.data.isDemo) return;
      const { ROWID, CREATORID, CREATEDTIME, MODIFIEDTIME, ...editable } = node.data.row;
      void ROWID;
      void CREATORID;
      void CREATEDTIME;
      void MODIFIEDTIME;

      const remove = () => {
        if (node.data.sourceTable === 'workspaceItems') deleteItem(node.data.row.ROWID as string);
        else if (node.data.sourceTable === 'caseHypotheses') deleteHypothesis(node.data.row.ROWID as string);
        else deleteTask(node.data.row.ROWID as string);
      };
      const recreate = () => {
        if (node.data.sourceTable === 'workspaceItems') createItem(editable);
        else if (node.data.sourceTable === 'caseHypotheses') createHypothesis(editable);
        else createTask(editable);
      };

      remove();
      setSelection({ type: 'none' });
      pushUndo({ label: 'Delete item', undo: recreate, redo: remove });
    },
    [deleteItem, deleteHypothesis, deleteTask, createItem, createHypothesis, createTask, pushUndo]
  );

  const handleDeleteEdge = useCallback(
    (edge: CanvasEdge) => {
      if (edge.data.isDemo) return;
      const { ROWID, CREATORID, CREATEDTIME, MODIFIEDTIME, ...editable } = edge.data.row;
      void ROWID;
      void CREATORID;
      void CREATEDTIME;
      void MODIFIEDTIME;

      const remove = () => deleteEdgeRow(edge.data.row.ROWID as string);
      const recreate = () => createEdgeRow(editable);

      remove();
      setSelection({ type: 'none' });
      pushUndo({ label: 'Delete relationship', undo: recreate, redo: remove });
    },
    [deleteEdgeRow, createEdgeRow, pushUndo]
  );

  const handleAutoLayout = useCallback(() => {
    const newPositions = computeAutoLayout(canvasNodes);
    setManualPositions((prev) => ({ ...prev, ...newPositions }));
    if (positionColumnX && positionColumnY) {
      for (const node of canvasNodes) {
        const pos = newPositions[node.id];
        if (node.data.sourceTable === 'workspaceItems' && !node.data.isDemo && pos) {
          updateItem({ ROWID: node.data.row.ROWID as string, [positionColumnX.column_name]: pos.x, [positionColumnY.column_name]: pos.y });
        }
      }
    }
  }, [canvasNodes, positionColumnX, positionColumnY, updateItem]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.key === 'Delete' || event.key === 'Backspace') && !isTypingTarget(event.target)) {
        if (selection.type === 'node') handleDeleteNode(selection.node);
        else if (selection.type === 'edge') handleDeleteEdge(selection.edge);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selection, handleDeleteNode, handleDeleteEdge, undo, redo]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: EntityFlowNode) => {
      event.preventDefault();
      const canvasNode = canvasNodes.find((n) => n.id === node.id);
      setContextMenu({ x: event.clientX, y: event.clientY, node: canvasNode });
    },
    [canvasNodes]
  );

  const onPaneContextMenu = useCallback((event: ReactMouseEvent | MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY });
  }, []);

  if (isLoading) {
    return (
      <div className="h-[70vh] rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const showSampleBadge = itemsResolved.isDemo || edgesResolved.isDemo || hypothesesResolved.isDemo || tasksResolved.isDemo;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setIsAddingItem(true)}>
          <Plus className="h-4 w-4" />
          Add item
        </Button>
        <Button variant="outline" size="sm" onClick={handleAutoLayout}>
          <LayoutGrid className="h-4 w-4" />
          Auto layout
        </Button>
        <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo} aria-label="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo} aria-label="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        {showSampleBadge && <Badge variant="warning">Sample data</Badge>}
        {notice && <span className="text-xs text-critical">{notice}</span>}
      </div>

      {isAddingItem && (
        <div className="rounded-lg border border-border bg-card p-4">
          {itemsSchema.data ? (
            <DynamicForm
              columns={itemsSchema.data}
              submitLabel="Add to board"
              isSubmitting={isCreatingItem}
              submitError={createItemError instanceof Error ? createItemError.message : null}
              onCancel={() => setIsAddingItem(false)}
              onSubmit={(values) => {
                const caseColumn = findColumnByPattern(itemsSchema.data!, CASE_ID_COLUMN_PATTERNS);
                const payload = caseColumn && !values[caseColumn.column_name] ? { ...values, [caseColumn.column_name]: caseId } : values;
                createItem(payload, { onSuccess: () => setIsAddingItem(false) });
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Create the WorkspaceItems table to add items to the board.</p>
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
            onNodeDragStop={handleNodeDragStop}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
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
                <>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => setIsAddingItem(true)}
                  >
                    Add item
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={handleAutoLayout}
                  >
                    Auto layout
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <InspectorPanel
          selection={selection}
          nodes={canvasNodes}
          edges={canvasEdges}
          schemas={{
            items: itemsResolved.columns,
            hypotheses: hypothesesResolved.columns,
            tasks: tasksResolved.columns,
            edges: edgesResolved.columns,
          }}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
        />
      </div>
    </div>
  );
}
