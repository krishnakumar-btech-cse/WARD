import { createLocalResourceService } from './createLocalResourceService';
import { WORKSPACE_ITEMS_DEMO } from '../shared/lib/demoData';
import type { WorkspaceItemRecord } from '../types/workspaceItem.types';

export const workspaceItemService = createLocalResourceService<WorkspaceItemRecord>('workspaceItems', WORKSPACE_ITEMS_DEMO);
