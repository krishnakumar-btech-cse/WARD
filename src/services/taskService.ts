import { createLocalResourceService } from './createLocalResourceService';
import { CASE_TASKS_DEMO } from '../shared/lib/demoData';
import type { CaseTaskRecord } from '../types/task.types';

export const taskService = createLocalResourceService<CaseTaskRecord>('caseTasks', CASE_TASKS_DEMO);
