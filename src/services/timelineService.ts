import { createLocalResourceService } from './createLocalResourceService';
import { TIMELINE_EVENTS_DEMO } from '../shared/lib/demoData';
import type { TimelineEventRecord } from '../types/timeline.types';

export const timelineService = createLocalResourceService<TimelineEventRecord>('timelineEvents', TIMELINE_EVENTS_DEMO);
