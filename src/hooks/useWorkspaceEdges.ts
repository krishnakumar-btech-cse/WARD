import { createCrudHooks } from './createCrudHooks';
import { workspaceEdgeService } from '../services/workspaceEdgeService';
import { queryKeys } from '../utils/queryKeys';
import type { WorkspaceEdgeRecord } from '../types/workspaceEdge.types';

export const {
  useList: useWorkspaceEdges,
  useItem: useWorkspaceEdge,
  useSchema: useWorkspaceEdgeSchema,
  useCreate: useCreateWorkspaceEdge,
  useUpdate: useUpdateWorkspaceEdge,
  useRemove: useDeleteWorkspaceEdge,
} = createCrudHooks<WorkspaceEdgeRecord>(workspaceEdgeService, queryKeys.workspaceEdges);
