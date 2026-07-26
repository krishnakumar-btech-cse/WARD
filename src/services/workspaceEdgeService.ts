import { createLocalResourceService } from './createLocalResourceService';
import { WORKSPACE_EDGES_DEMO } from '../shared/lib/demoData';
import type { WorkspaceEdgeRecord } from '../types/workspaceEdge.types';

export const workspaceEdgeService = createLocalResourceService<WorkspaceEdgeRecord>('workspaceEdges', WORKSPACE_EDGES_DEMO);
