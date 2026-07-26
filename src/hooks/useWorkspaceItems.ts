import { createCrudHooks } from './createCrudHooks';
import { workspaceItemService } from '../services/workspaceItemService';
import { queryKeys } from '../utils/queryKeys';
import type { WorkspaceItemRecord } from '../types/workspaceItem.types';

export const {
  useList: useWorkspaceItems,
  useItem: useWorkspaceItem,
  useSchema: useWorkspaceItemSchema,
  useCreate: useCreateWorkspaceItem,
  useUpdate: useUpdateWorkspaceItem,
  useRemove: useDeleteWorkspaceItem,
} = createCrudHooks<WorkspaceItemRecord>(workspaceItemService, queryKeys.workspaceItems);
