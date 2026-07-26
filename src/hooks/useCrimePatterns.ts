import { createCrudHooks } from './createCrudHooks';
import { crimePatternService } from '../services/crimePatternService';
import { queryKeys } from '../utils/queryKeys';
import type { CrimePatternAggregateRecord } from '../types/crimePattern.types';

export const {
  useList: useCrimePatternAggregates,
  useItem: useCrimePatternAggregate,
  useSchema: useCrimePatternAggregateSchema,
} = createCrudHooks<CrimePatternAggregateRecord>(crimePatternService, queryKeys.crimePatternAggregates);
