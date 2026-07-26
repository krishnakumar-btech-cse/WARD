import type { CatalystRow } from './catalyst.types';

/**
 * Columns beyond the base row metadata are intentionally left open until the
 * "Cases" table schema is confirmed against the Catalyst console — narrow
 * this interface with the real column names rather than guessing them here.
 */
export interface CaseRecord extends CatalystRow {}

export type CreateCaseInput = Partial<Omit<CaseRecord, 'ROWID' | 'CREATORID' | 'CREATEDTIME' | 'MODIFIEDTIME'>>;
export type UpdateCaseInput = CreateCaseInput & { ROWID: string };

export interface ListCasesParams {
  nextToken?: string;
  maxRows?: number;
}
