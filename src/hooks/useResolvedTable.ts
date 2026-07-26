import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { resolveTableDisplay, type DemoDataset, type ResolvedTableDisplay } from '../shared/lib/demoData';
import { env } from '../utils/env';
import type { CatalystColumnMeta } from '../types/catalyst-sdk';
import type { CatalystPagedResponse, CatalystRow } from '../types/catalyst.types';

export type ResolvedTable<T extends CatalystRow> = ResolvedTableDisplay<T> & { isPending: boolean };

/**
 * The "fetch list + schema, fall back to demo data" sequence every tab
 * needs (Evidence, Notebook, Timeline, ...). One hook instead of repeating
 * the resolveTableDisplay wiring at every call site.
 *
 * Memoized on purpose: consumers that sync this into other state via a
 * useEffect (React Flow's setNodes/setEdges, for one) need a referentially
 * stable result when nothing has actually changed, or that effect re-fires
 * every render and loops.
 */
export function useResolvedTable<T extends CatalystRow>(
  useList: () => UseQueryResult<CatalystPagedResponse<T[]>>,
  useSchema: () => UseQueryResult<CatalystColumnMeta[]>,
  demoDataset: DemoDataset
): ResolvedTable<T> {
  const listQuery = useList();
  const schemaQuery = useSchema();
  const fallbackEnabled = env.features.enableSampleDataFallback;

  return useMemo(() => {
    const resolved = resolveTableDisplay<T>({
      schema: schemaQuery.data,
      schemaIsError: schemaQuery.isError,
      realRows: listQuery.data?.content ?? [],
      listSettled: !listQuery.isPending,
      demoDataset,
      fallbackEnabled,
    });
    return { ...resolved, isPending: listQuery.isPending || schemaQuery.isPending };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    schemaQuery.data,
    schemaQuery.isError,
    schemaQuery.isPending,
    listQuery.data,
    listQuery.isPending,
    demoDataset,
    fallbackEnabled,
  ]);
}
