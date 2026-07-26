import { createLocalFileAttachedResourceService } from './createLocalFileAttachedResourceService';
import { EVIDENCE_DEMO } from '../shared/lib/demoData';
import type { ApiResult } from '../utils/apiResponse';
import type {
  EvidenceRecord,
  CreateEvidenceInput,
  ListEvidenceParams,
  UpdateEvidenceInput,
  UploadEvidenceFileInput,
} from '../types/evidence.types';

const local = createLocalFileAttachedResourceService<EvidenceRecord>('evidence', EVIDENCE_DEMO);

/** Evidence has two halves: row metadata and file bytes (see createLocalFileAttachedResourceService). Method names here (createRecord/updateRecord/removeRecord) match what hooks/useEvidence.ts calls. */
class EvidenceService {
  list(params?: ListEvidenceParams) {
    return local.list(params);
  }

  getById(rowId: string): Promise<ApiResult<EvidenceRecord>> {
    return local.getById(rowId);
  }

  createRecord(input: CreateEvidenceInput): Promise<ApiResult<EvidenceRecord[]>> {
    return local.create(input);
  }

  updateRecord(input: UpdateEvidenceInput): Promise<ApiResult<EvidenceRecord[]>> {
    return local.update(input);
  }

  removeRecord(rowId: string): Promise<ApiResult<EvidenceRecord>> {
    return local.remove(rowId);
  }

  getSchema() {
    return local.getSchema();
  }

  uploadFile(input: UploadEvidenceFileInput) {
    return local.uploadFile(input);
  }

  downloadFile(key: string, options?: Record<string, unknown>) {
    return local.downloadFile(key, options);
  }

  deleteFile(key: string, options?: Record<string, unknown>) {
    return local.deleteFile(key, options);
  }
}

export const evidenceService = new EvidenceService();
