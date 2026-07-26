import type { CatalystRow } from './catalyst.types';

/**
 * A typed relationship between two WorkspaceItems. Columns beyond row
 * metadata are left open until the WorkspaceEdges table is created and its
 * schema known.
 */
export interface WorkspaceEdgeRecord extends CatalystRow {}
