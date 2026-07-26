import {
  UserRound,
  HeartPulse,
  Eye,
  Car,
  MapPin,
  Fingerprint,
  Lightbulb,
  ListChecks,
  CircleDot,
  type LucideIcon,
} from 'lucide-react';
import type { CanvasNodeKind } from './canvasTypes';

export interface NodeStyle {
  icon: LucideIcon;
  classes: string;
}

/** One qualitative hue per entity kind — distinct from the app's semantic status/priority colors on purpose. */
export const NODE_STYLES: Record<CanvasNodeKind, NodeStyle> = {
  Suspect: {
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
  Location: {
    icon: MapPin,
    classes:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  },
  Evidence: {
    icon: Fingerprint,
    classes:
      'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300',
  },
  Hypothesis: {
    icon: Lightbulb,
    classes: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-300',
  },
  Task: {
    icon: ListChecks,
    classes:
      'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300',
  },
  Other: {
    icon: CircleDot,
    classes: 'border-border bg-card text-foreground',
  },
};
