import {
  UserRound,
  HeartPulse,
  Eye,
  Car,
  Smartphone,
  MapPin,
  Building2,
  Landmark,
  Fingerprint,
  Folder,
  CircleDot,
  type LucideIcon,
} from 'lucide-react';
import type { NetworkEntityKind } from './networkTypes';

export interface NetworkNodeStyle {
  icon: LucideIcon;
  classes: string;
}

export const NETWORK_NODE_STYLES: Record<NetworkEntityKind, NetworkNodeStyle> = {
  Person: {
    icon: UserRound,
    classes: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
  },
  Victim: {
    icon: HeartPulse,
    classes: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  },
  Witness: {
    icon: Eye,
    classes:
      'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300',
  },
  Vehicle: {
    icon: Car,
    classes: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
  },
  Device: {
    icon: Smartphone,
    classes: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-300',
  },
  Location: {
    icon: MapPin,
    classes:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  },
  Organization: {
    icon: Building2,
    classes: 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300',
  },
  FinancialAccount: {
    icon: Landmark,
    classes:
      'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
  Evidence: {
    icon: Fingerprint,
    classes:
      'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300',
  },
  Case: {
    icon: Folder,
    classes: 'border-primary bg-primary/10 text-primary',
  },
  Other: {
    icon: CircleDot,
    classes: 'border-border bg-card text-foreground',
  },
};

export const NETWORK_KIND_LABELS: Record<NetworkEntityKind, string> = {
  Person: 'Person',
  Victim: 'Victim',
  Witness: 'Witness',
  Vehicle: 'Vehicle',
  Device: 'Device',
  Location: 'Location',
  Organization: 'Organization',
  FinancialAccount: 'Financial Account',
  Evidence: 'Evidence',
  Case: 'Case',
  Other: 'Other',
};
