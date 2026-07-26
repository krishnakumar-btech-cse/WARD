import type { CatalystRow } from '../../types/catalyst.types';

export type NetworkEntityKind =
  | 'Person'
  | 'Victim'
  | 'Witness'
  | 'Vehicle'
  | 'Device'
  | 'Location'
  | 'Organization'
  | 'FinancialAccount'
  | 'Evidence'
  | 'Case'
  | 'Other';

export interface NetworkNodeData {
  kind: NetworkEntityKind;
  label: string;
  riskScore?: number;
  row: CatalystRow;
  isDemo: boolean;
  [key: string]: unknown;
}

export interface NetworkEdgeData {
  relationshipType?: string;
  strength?: number;
  row: CatalystRow;
  isDemo: boolean;
  [key: string]: unknown;
}

export function inferNetworkEntityKind(entityType: string | undefined): NetworkEntityKind {
  const value = (entityType ?? '').toLowerCase();
  if (value.includes('victim')) return 'Victim';
  if (value.includes('witness')) return 'Witness';
  if (value.includes('person') || value.includes('suspect') || value.includes('individual')) return 'Person';
  if (value.includes('vehicle') || value.includes('car')) return 'Vehicle';
  if (value.includes('device') || value.includes('phone') || value.includes('sim')) return 'Device';
  if (value.includes('location') || value.includes('address') || value.includes('place')) return 'Location';
  if (value.includes('financial') || value.includes('account') || value.includes('bank')) return 'FinancialAccount';
  if (value.includes('organization') || value.includes('org') || value.includes('company')) return 'Organization';
  if (value.includes('evidence')) return 'Evidence';
  if (value.includes('case')) return 'Case';
  return 'Other';
}
