import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caseService } from '../services/caseService';
import { queryKeys } from '../utils/queryKeys';
import { unwrap } from '../utils/apiResponse';
import type { CreateCaseInput, ListCasesParams, UpdateCaseInput } from '../types/case.types';

export function useCases(params?: ListCasesParams) {
  return useQuery({
    queryKey: queryKeys.cases.list(params),
    queryFn: () => caseService.list(params).then(unwrap),
  });
}

export function useCase(rowId: string) {
  return useQuery({
    queryKey: queryKeys.cases.detail(rowId),
    queryFn: () => caseService.getById(rowId).then(unwrap),
    enabled: Boolean(rowId),
  });
}

/** Live Cases table schema — columns rarely change, so this is cached longer than record data. */
export function useCaseSchema() {
  return useQuery({
    queryKey: queryKeys.cases.schema(),
    queryFn: () => caseService.getSchema().then(unwrap),
    staleTime: 5 * 60_000,
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCaseInput) => caseService.create(input).then(unwrap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() }),
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCaseInput) => caseService.update(input).then(unwrap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() }),
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rowId: string) => caseService.remove(rowId).then(unwrap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() }),
  });
}
