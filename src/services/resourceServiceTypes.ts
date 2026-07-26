import type { ApiResult } from '../utils/apiResponse';
import type { CatalystColumnMeta } from '../types/catalyst-sdk';
import type { CatalystPagedResponse, CatalystRow } from '../types/catalyst.types';

/**
 * Every schema-agnostic table (Cases, Evidence, Notebook, Timeline,
 * Workspace items/edges, Network entities/relationships, ...) needs the
 * same six operations. Implemented locally in createLocalResourceService.ts.
 */
export interface ResourceService<T extends CatalystRow> {
  list(params?: { nextToken?: string; maxRows?: number }): Promise<ApiResult<CatalystPagedResponse<T[]>>>;
  getById(rowId: string): Promise<ApiResult<T>>;
  create(input: Record<string, unknown>): Promise<ApiResult<T[]>>;
  update(input: Record<string, unknown> & { ROWID: string }): Promise<ApiResult<T[]>>;
  remove(rowId: string): Promise<ApiResult<T>>;
  getSchema(): Promise<ApiResult<CatalystColumnMeta[]>>;
}

export interface UploadFileInput {
  key: string;
  file: File | Blob | string;
  options?: Record<string, unknown>;
}

/** Same six-operation CRUD as ResourceService, plus the file upload/download/delete trio a case's evidence/notebook needs. */
export interface FileAttachedResourceService<T extends CatalystRow> extends ResourceService<T> {
  uploadFile(input: UploadFileInput): Promise<ApiResult<boolean>>;
  downloadFile(key: string, options?: Record<string, unknown>): Promise<ApiResult<unknown>>;
  deleteFile(key: string, options?: Record<string, unknown>): Promise<ApiResult<boolean>>;
}
