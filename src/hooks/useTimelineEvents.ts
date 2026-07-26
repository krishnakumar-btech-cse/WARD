import { createCrudHooks } from './createCrudHooks';
import { timelineService } from '../services/timelineService';
import { queryKeys } from '../utils/queryKeys';
import type { TimelineEventRecord } from '../types/timeline.types';

export const {
  useList: useTimelineEvents,
  useItem: useTimelineEvent,
  useSchema: useTimelineEventSchema,
  useCreate: useCreateTimelineEvent,
  useUpdate: useUpdateTimelineEvent,
  useRemove: useDeleteTimelineEvent,
} = createCrudHooks<TimelineEventRecord>(timelineService, queryKeys.timelineEvents);
