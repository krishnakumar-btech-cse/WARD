import { lazy, Suspense } from 'react';
import { SchemaResourcePanel } from '../../shared/components/SchemaResourcePanel';
import { Skeleton } from '../../shared/components/ui/skeleton';
import {
  useNetworkEntities,
  useNetworkEntitySchema,
  useCreateNetworkEntity,
  useDeleteNetworkEntity,
} from '../../hooks/useNetworkEntities';
import {
  useNetworkRelationships,
  useNetworkRelationshipSchema,
  useCreateNetworkRelationship,
  useDeleteNetworkRelationship,
} from '../../hooks/useNetworkRelationships';
import { NETWORK_ENTITIES_DEMO, NETWORK_RELATIONSHIPS_DEMO } from '../../shared/lib/demoData';

// @xyflow/react is a large dependency — code-split it out of the main
// bundle, same as the Investigation Workspace canvas.
const NetworkGraphCanvas = lazy(() =>
  import('./NetworkGraphCanvas').then((m) => ({ default: m.NetworkGraphCanvas }))
);

/**
 * Cross-case criminal network view. The graph (pan/zoom/connect/path
 * discovery/central-entity ranking) is the primary surface; the entity and
 * relationship tables below it stay available for full-field CRUD the same
 * way Hypotheses/Tasks stay available under the Investigation Workspace
 * board.
 */
export function NetworkAnalysisPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Criminal Network Analysis</h1>
        <p className="text-sm text-muted-foreground">Resolved entities and relationships across cases.</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[70vh] w-full rounded-lg" />}>
        <NetworkGraphCanvas />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <SchemaResourcePanel
          title="Entities"
          description="People, vehicles, devices, locations, and financial entities resolved across cases."
          emptyMessage="No entities resolved yet."
          demoDataset={NETWORK_ENTITIES_DEMO}
          hooks={{
            useList: useNetworkEntities,
            useSchema: useNetworkEntitySchema,
            useCreate: useCreateNetworkEntity,
            useRemove: useDeleteNetworkEntity,
          }}
        />

        <SchemaResourcePanel
          title="Relationships"
          description="Typed, weighted connections between entities."
          emptyMessage="No relationships mapped yet."
          demoDataset={NETWORK_RELATIONSHIPS_DEMO}
          hooks={{
            useList: useNetworkRelationships,
            useSchema: useNetworkRelationshipSchema,
            useCreate: useCreateNetworkRelationship,
            useRemove: useDeleteNetworkRelationship,
          }}
        />
      </div>
    </div>
  );
}
