import { createCrudHooks } from './createCrudHooks';
import { taskService } from '../services/taskService';
import { queryKeys } from '../utils/queryKeys';
import type { CaseTaskRecord } from '../types/task.types';

export const {
  useList: useCaseTasks,
  useItem: useCaseTask,
  useSchema: useCaseTaskSchema,
  useCreate: useCreateCaseTask,
  useUpdate: useUpdateCaseTask,
  useRemove: useDeleteCaseTask,
} = createCrudHooks<CaseTaskRecord>(taskService, queryKeys.caseTasks);
