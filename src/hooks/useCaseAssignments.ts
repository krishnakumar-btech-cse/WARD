import { createCrudHooks } from './createCrudHooks';
import { caseAssignmentService } from '../services/caseAssignmentService';
import { queryKeys } from '../utils/queryKeys';
import type { CaseAssignmentRecord } from '../types/caseAssignment.types';

export const {
  useList: useCaseAssignments,
  useSchema: useCaseAssignmentSchema,
  useCreate: useCreateCaseAssignment,
  useRemove: useDeleteCaseAssignment,
} = createCrudHooks<CaseAssignmentRecord>(caseAssignmentService, queryKeys.caseAssignments);
