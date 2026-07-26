import { createLocalResourceService } from './createLocalResourceService';
import { CRIME_PATTERN_AGGREGATES_DEMO } from '../shared/lib/demoData';
import type { CrimePatternAggregateRecord } from '../types/crimePattern.types';

export const crimePatternService = createLocalResourceService<CrimePatternAggregateRecord>(
  'crimePatternAggregates',
  CRIME_PATTERN_AGGREGATES_DEMO
);
