import { createLocalResourceService } from './createLocalResourceService';
import { NETWORK_RELATIONSHIPS_DEMO } from '../shared/lib/demoData';
import type { NetworkRelationshipRecord } from '../types/networkRelationship.types';

export const networkRelationshipService = createLocalResourceService<NetworkRelationshipRecord>(
  'networkRelationships',
  NETWORK_RELATIONSHIPS_DEMO
);
