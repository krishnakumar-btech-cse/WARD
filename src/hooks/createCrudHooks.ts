import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '../utils/apiResponse';
import type { ResourceService } from '../services/resourceServiceTypes';
import type { CatalystRow } from '../types/catalyst.types';

export interface ResourceQueryKeys {
  all: () => readonly unknown[];
  list: (params?: object) => readonly unknown[];
  detail: (id: string) => readonly unknown[];
  schema: () => readonly unknown[];
}

/**
 * Generates the standard list/detail/schema/create/update/remove hook set
 * for a resource, so every new table-backed feature doesn't re-implement
 * the same useQuery/useMutation wiring caseService's hooks already do.
 */
export function createCrudHooks<T extends CatalystRow>(service: ResourceService<T>, keys: ResourceQueryKeys) {
  function useList(params?: { nextToken?: string; maxRows?: number }) {
    return useQuery({
      queryKey: keys.list(params),
      queryFn: () => service.list(params).then(unwrap),
    });
  }

  function useItem(rowId: string) {
    return useQuery({
      queryKey: keys.detail(rowId),
      queryFn: () => service.getById(rowId).then(unwrap),
      enabled: Boolean(rowId),
    });
  }

  function useSchema() {
    return useQuery({
      queryKey: keys.schema(),
      queryFn: () => service.getSchema().then(unwrap),
      staleTime: 5 * 60_000,
    });
  }

  function useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input: Record<string, unknown>) => service.create(input).then(unwrap),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all() }),
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (input: Record<string, unknown> & { ROWID: string }) => service.update(input).then(unwrap),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all() }),
    });
  }

  function useRemove() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (rowId: string) => service.remove(rowId).then(unwrap),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all() }),
    });
  }

  return { useList, useItem, useSchema, useCreate, useUpdate, useRemove };
}

export type CrudHooks<T extends CatalystRow> = ReturnType<typeof createCrudHooks<T>>;
