import { createCrudHooks } from './createCrudHooks';
import { networkRelationshipService } from '../services/networkRelationshipService';
import { queryKeys } from '../utils/queryKeys';
import type { NetworkRelationshipRecord } from '../types/networkRelationship.types';

export const {
  useList: useNetworkRelationships,
  useItem: useNetworkRelationship,
  useSchema: useNetworkRelationshipSchema,
  useCreate: useCreateNetworkRelationship,
  useUpdate: useUpdateNetworkRelationship,
  useRemove: useDeleteNetworkRelationship,
} = createCrudHooks<NetworkRelationshipRecord>(networkRelationshipService, queryKeys.networkRelationships);
