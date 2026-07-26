import { createCrudHooks } from './createCrudHooks';
import { hypothesisService } from '../services/hypothesisService';
import { queryKeys } from '../utils/queryKeys';
import type { CaseHypothesisRecord } from '../types/hypothesis.types';

export const {
  useList: useHypotheses,
  useItem: useHypothesis,
  useSchema: useHypothesisSchema,
  useCreate: useCreateHypothesis,
  useUpdate: useUpdateHypothesis,
  useRemove: useDeleteHypothesis,
} = createCrudHooks<CaseHypothesisRecord>(hypothesisService, queryKeys.caseHypotheses);
