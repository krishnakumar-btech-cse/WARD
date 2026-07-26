import { createCrudHooks } from './createCrudHooks';
import { userDirectoryService, roleDirectoryService, policeStationDirectoryService } from '../services/adminService';
import { queryKeys } from '../utils/queryKeys';
import type { UserRecord, RoleRecord, PoliceStationRecord } from '../types/admin.types';

// Users are intentionally read-only here — provisioning a real user means
// creating a Catalyst Auth account, not inserting a Data Store row, so no
// create/remove is exposed for this one.
export const { useList: useUserDirectory, useSchema: useUserDirectorySchema } = createCrudHooks<UserRecord>(
  userDirectoryService,
  queryKeys.adminUsers
);

export const {
  useList: useRoleDirectory,
  useSchema: useRoleDirectorySchema,
  useCreate: useCreateRole,
  useRemove: useDeleteRole,
} = createCrudHooks<RoleRecord>(roleDirectoryService, queryKeys.adminRoles);

export const {
  useList: usePoliceStationDirectory,
  useSchema: usePoliceStationDirectorySchema,
  useCreate: useCreatePoliceStation,
  useRemove: useDeletePoliceStation,
} = createCrudHooks<PoliceStationRecord>(policeStationDirectoryService, queryKeys.adminPoliceStations);
