import { createLocalResourceService } from './createLocalResourceService';
import { CASES_DEMO } from '../shared/lib/demoData';
import type { CaseRecord } from '../types/case.types';

export const caseService = createLocalResourceService<CaseRecord>('cases', CASES_DEMO);
