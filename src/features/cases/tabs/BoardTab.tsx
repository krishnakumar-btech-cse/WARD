import { lazy, Suspense } from 'react';
import { SchemaResourcePanel } from '../../../shared/components/SchemaResourcePanel';
import { Skeleton } from '../../../shared/components/ui/skeleton';
import { useHypotheses, useHypothesisSchema, useCreateHypothesis, useDeleteHypothesis } from '../../../hooks/useHypotheses';
import { useCaseTasks, useCaseTaskSchema, useCreateCaseTask, useDeleteCaseTask } from '../../../hooks/useCaseTasks';
import { CASE_ID_COLUMN_PATTERNS } from '../../../shared/lib/utils';
import { CASE_HYPOTHESES_DEMO, CASE_TASKS_DEMO } from '../../../shared/lib/demoData';

// @xyflow/react is a large dependency only needed once someone opens this
// tab — code-split it out of the main bundle instead of loading it eagerly
// for every session.
const WorkspaceCanvas = lazy(() =>
  import('../workspace/WorkspaceCanvas').then((m) => ({ default: m.WorkspaceCanvas }))
);

/**
 * The Investigation Workspace board: an interactive canvas (pan/zoom/drag/
 * connect/undo-redo) merging WorkspaceItems, WorkspaceEdges, Hypotheses, and
 * Tasks into one graph, with a context-aware Inspector Panel. Hypotheses and
 * Tasks also get their own management lists below — the canvas visualizes
 * and lets you delete/connect them, but full field entry still goes through
 * their schema-driven forms.
 */
export function BoardTab({ caseId }: { caseId: string }) {
  return (
    <div className="space-y-8">
      <Suspense fallback={<Skeleton className="h-[70vh] w-full rounded-lg" />}>
        <WorkspaceCanvas caseId={caseId} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <SchemaResourcePanel
          title="Hypotheses"
          description="Investigator theories for this case."
          emptyMessage="No hypotheses recorded yet."
          linkColumnPatterns={CASE_ID_COLUMN_PATTERNS}
          linkValue={caseId}
          demoDataset={CASE_HYPOTHESES_DEMO}
          hooks={{
            useList: useHypotheses,
            useSchema: useHypothesisSchema,
            useCreate: useCreateHypothesis,
            useRemove: useDeleteHypothesis,
          }}
        />

        <SchemaResourcePanel
          title="Tasks"
          description="Actionable items tracked for this case."
          emptyMessage="No tasks yet."
          linkColumnPatterns={CASE_ID_COLUMN_PATTERNS}
          linkValue={caseId}
          demoDataset={CASE_TASKS_DEMO}
          hooks={{
            useList: useCaseTasks,
            useSchema: useCaseTaskSchema,
            useCreate: useCreateCaseTask,
            useRemove: useDeleteCaseTask,
          }}
        />
      </div>
    </div>
  );
}
