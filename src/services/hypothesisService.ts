import { createLocalResourceService } from './createLocalResourceService';
import { CASE_HYPOTHESES_DEMO } from '../shared/lib/demoData';
import type { CaseHypothesisRecord } from '../types/hypothesis.types';

export const hypothesisService = createLocalResourceService<CaseHypothesisRecord>('caseHypotheses', CASE_HYPOTHESES_DEMO);
