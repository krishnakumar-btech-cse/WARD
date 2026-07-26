import type { CatalystRow } from './catalyst.types';

/**
 * A node on the Investigation Workspace board — evidence, suspect, victim,
 * location, vehicle, hypothesis, or task. Columns beyond row metadata are
 * left open until the WorkspaceItems table is created and its schema known.
 */
export interface WorkspaceItemRecord extends CatalystRow {}
