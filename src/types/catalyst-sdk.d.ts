/**
 * Ambient shape of `window.catalyst`, injected at runtime by the two script
 * tags Catalyst Client hosting adds to index.html:
 *   <script src="https://static.zohocdn.com/catalyst/sdk/js/4.0.0/catalystWebSDK.js"></script>
 *   <script src="/__catalyst/sdk/init.js"></script>
 *
 * Method names and payload shapes below are transcribed from the official
 * Web SDK v4 reference (docs.catalyst.zoho.com/en/sdk/web/v4). This file
 * declares only what services/ actually calls.
 */
import type { CatalystApiResponse, CatalystPagedResponse, CatalystRow, CatalystUser } from './catalyst.types';

export interface CatalystRowRef<T extends CatalystRow = CatalystRow> {
  get(): Promise<CatalystApiResponse<T>>;
  delete(): Promise<CatalystApiResponse<T>>;
}

/** Column definition as returned by table.getColumns() — the source of truth for schema-driven forms. */
export interface CatalystColumnMeta {
  table_id: string;
  column_id: string;
  column_name: string;
  column_sequence?: string;
  category?: number;
  data_type: string;
  max_length?: string;
  decimal_digits?: string;
  is_mandatory: boolean;
  is_unique?: boolean;
  audit_consent?: boolean;
  search_index_enabled?: boolean;
}

export interface CatalystColumnRef {
  get(): Promise<CatalystApiResponse<CatalystColumnMeta>>;
}

export interface CatalystTableRef<T extends CatalystRow = CatalystRow> {
  addRow(rows: Record<string, unknown>[]): Promise<CatalystApiResponse<T[]>>;
  updateRow(rows: Array<Record<string, unknown> & { ROWID: string }>): Promise<CatalystApiResponse<T[]>>;
  rowId(id: string | number): CatalystRowRef<T>;
  getPagedRows(params?: { next_token?: string; max_rows?: number }): Promise<CatalystPagedResponse<T[]>>;
  columnId(name: string): CatalystColumnRef;
  getColumns(): Promise<CatalystApiResponse<CatalystColumnMeta[]>>;
}

export interface CatalystTableComponent {
  tableId<T extends CatalystRow = CatalystRow>(idOrName: string): CatalystTableRef<T>;
}

export interface CatalystZCQL {
  executeQuery<T = CatalystRow>(query: string): Promise<CatalystApiResponse<T[]>>;
}

export interface CatalystAuthComponent {
  signIn(elementId: string): void;
  signOut(redirectUrl?: string): void;
  isUserAuthenticated(): Promise<CatalystApiResponse<CatalystUser>>;
}

export interface CatalystUserManagementComponent {
  getCurrentProjectUser(): Promise<CatalystApiResponse<CatalystUser>>;
}

export interface CatalystStratusTransferHandle<T> {
  start(): Promise<T>;
  abort(): void;
}

export interface CatalystStratusBucketRef {
  putObject(
    key: string,
    data: File | Blob | string,
    options?: Record<string, unknown>
  ): Promise<CatalystStratusTransferHandle<CatalystApiResponse<boolean>>>;
  getObject(
    key: string,
    options?: Record<string, unknown>
  ): Promise<CatalystStratusTransferHandle<unknown>>;
  deleteObject(key: string, options?: Record<string, unknown>): Promise<CatalystApiResponse<boolean>>;
}

export interface CatalystStratusComponent {
  bucket(name: string): CatalystStratusBucketRef;
}

export interface CatalystFunctionExecuteConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: BodyInit | Record<string, unknown> | null;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
}

export interface CatalystFunctionRef {
  execute(config?: CatalystFunctionExecuteConfig): Promise<Response>;
}

export interface CatalystFunctionComponent {
  functionId(idOrName: string): CatalystFunctionRef;
}

export interface CatalystApp {
  auth: CatalystAuthComponent;
  userManagement: CatalystUserManagementComponent;
  table: CatalystTableComponent;
  ZCatalystQL: CatalystZCQL;
  stratus: CatalystStratusComponent;
  function: CatalystFunctionComponent;
  setCatalystEnv?(key: string, value: string): void;
  getCatalystEnv?(key: string): string | undefined;
  deleteCatalystEnv?(key: string): void;
}

declare global {
  interface Window {
    catalyst?: CatalystApp;
  }
}
