import { FolderPlus, UserPlus, Fingerprint, NotebookPen, RefreshCw, Sparkles, type LucideIcon } from 'lucide-react';
import type { TimelineEventKind } from './resolveTimelineFeed';

export interface TimelineKindStyle {
  icon: LucideIcon;
  label: string;
  dotClasses: string;
}

export const TIMELINE_KIND_STYLES: Record<TimelineEventKind, TimelineKindStyle> = {
  case: { icon: FolderPlus, label: 'Case', dotClasses: 'border-primary bg-primary/10 text-primary' },
  assignment: { icon: UserPlus, label: 'Assignments', dotClasses: 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300' },
  evidence: { icon: Fingerprint, label: 'Evidence', dotClasses: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300' },
  notebook: { icon: NotebookPen, label: 'Notebook', dotClasses: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' },
  status: { icon: RefreshCw, label: 'Status changes', dotClasses: 'border-warning bg-warning/10 text-warning' },
  update: { icon: Sparkles, label: 'Updates', dotClasses: 'border-border bg-muted text-muted-foreground' },
};
