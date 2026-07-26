import { SchemaResourcePanel } from '../../shared/components/SchemaResourcePanel';
import {
  useUserDirectory,
  useUserDirectorySchema,
  useRoleDirectory,
  useRoleDirectorySchema,
  useCreateRole,
  useDeleteRole,
  usePoliceStationDirectory,
  usePoliceStationDirectorySchema,
  useCreatePoliceStation,
  useDeletePoliceStation,
} from '../../hooks/useAdminDirectories';

/**
 * Administrator-only console. Users is read-only — real user provisioning
 * happens through the department's identity system, not a directory insert
 * here. Roles and PoliceStations are plain reference data and get full CRUD.
 */
export function AdminPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">Users, roles, and police stations for Central Metropolitan Police Department.</p>
      </div>

      <SchemaResourcePanel
        title="Users"
        description="Read-only — provision new accounts through department sign-in setup, not here."
        emptyMessage="No users found."
        readOnly
        maxColumns={6}
        hooks={{ useList: useUserDirectory, useSchema: useUserDirectorySchema }}
      />

      <SchemaResourcePanel
        title="Roles"
        emptyMessage="No roles configured yet."
        hooks={{
          useList: useRoleDirectory,
          useSchema: useRoleDirectorySchema,
          useCreate: useCreateRole,
          useRemove: useDeleteRole,
        }}
      />

      <SchemaResourcePanel
        title="Police Stations"
        emptyMessage="No police stations configured yet."
        hooks={{
          useList: usePoliceStationDirectory,
          useSchema: usePoliceStationDirectorySchema,
          useCreate: useCreatePoliceStation,
          useRemove: useDeletePoliceStation,
        }}
      />
    </div>
  );
}
