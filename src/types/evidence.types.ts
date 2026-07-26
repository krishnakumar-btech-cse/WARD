import type { CatalystRow } from './catalyst.types';

/**
 * Columns beyond the base row metadata are intentionally left open until the
 * "Evidence" table schema is confirmed against the Catalyst console.
 */
export interface EvidenceRecord extends CatalystRow {}

export type CreateEvidenceInput = Partial<Omit<EvidenceRecord, 'ROWID' | 'CREATORID' | 'CREATEDTIME' | 'MODIFIEDTIME'>>;
export type UpdateEvidenceInput = CreateEvidenceInput & { ROWID: string };

export interface ListEvidenceParams {
  nextToken?: string;
  maxRows?: number;
}

export interface UploadEvidenceFileInput {
  /** Object key under the evidence Stratus bucket. */
  key: string;
  file: File | Blob | string;
  options?: Record<string, unknown>;
}
