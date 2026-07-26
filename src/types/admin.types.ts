import type { CatalystRow } from './catalyst.types';

/**
 * Raw Data Store rows for the Users/Roles/PoliceStations tables — distinct
 * from CatalystUser (the auth SDK's session/profile shape) since Admin
 * manages the underlying records, not the signed-in session.
 */
export interface UserRecord extends CatalystRow {}
export interface RoleRecord extends CatalystRow {}
export interface PoliceStationRecord extends CatalystRow {}
