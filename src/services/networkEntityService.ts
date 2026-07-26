import { createLocalResourceService } from './createLocalResourceService';
import { NETWORK_ENTITIES_DEMO } from '../shared/lib/demoData';
import type { NetworkEntityRecord } from '../types/networkEntity.types';

export const networkEntityService = createLocalResourceService<NetworkEntityRecord>('networkEntities', NETWORK_ENTITIES_DEMO);
