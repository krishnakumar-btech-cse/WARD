import { createLocalResourceService } from './createLocalResourceService';
import { USERS_DEMO, ROLES_DEMO, POLICE_STATIONS_DEMO } from '../shared/lib/demoData';
import type { UserRecord, RoleRecord, PoliceStationRecord } from '../types/admin.types';

export const userDirectoryService = createLocalResourceService<UserRecord>('adminUsers', USERS_DEMO);
export const roleDirectoryService = createLocalResourceService<RoleRecord>('adminRoles', ROLES_DEMO);
export const policeStationDirectoryService = createLocalResourceService<PoliceStationRecord>('adminPoliceStations', POLICE_STATIONS_DEMO);
