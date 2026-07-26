import { createLocalResourceService } from './createLocalResourceService';
import { CASE_ASSIGNMENTS_DEMO } from '../shared/lib/demoData';
import type { CaseAssignmentRecord } from '../types/caseAssignment.types';

export const caseAssignmentService = createLocalResourceService<CaseAssignmentRecord>('caseAssignments', CASE_ASSIGNMENTS_DEMO);
