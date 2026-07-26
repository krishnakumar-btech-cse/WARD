import { createCrudHooks } from './createCrudHooks';
import { networkEntityService } from '../services/networkEntityService';
import { queryKeys } from '../utils/queryKeys';
import type { NetworkEntityRecord } from '../types/networkEntity.types';

export const {
  useList: useNetworkEntities,
  useItem: useNetworkEntity,
  useSchema: useNetworkEntitySchema,
  useCreate: useCreateNetworkEntity,
  useUpdate: useUpdateNetworkEntity,
  useRemove: useDeleteNetworkEntity,
} = createCrudHooks<NetworkEntityRecord>(networkEntityService, queryKeys.networkEntities);
