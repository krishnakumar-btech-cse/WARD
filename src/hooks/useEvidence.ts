import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { evidenceService } from '../services/evidenceService';
import { queryKeys } from '../utils/queryKeys';
import { unwrap } from '../utils/apiResponse';
import { useFilePreviewUrl } from './useFilePreviewUrl';
import type {
  CreateEvidenceInput,
  ListEvidenceParams,
  UpdateEvidenceInput,
  UploadEvidenceFileInput,
} from '../types/evidence.types';

export function useEvidenceList(params?: ListEvidenceParams) {
  return useQuery({
    queryKey: queryKeys.evidence.list(params),
    queryFn: () => evidenceService.list(params).then(unwrap),
  });
}

export function useEvidenceItem(rowId: string) {
  return useQuery({
    queryKey: queryKeys.evidence.detail(rowId),
    queryFn: () => evidenceService.getById(rowId).then(unwrap),
    enabled: Boolean(rowId),
  });
}

export function useEvidenceSchema() {
  return useQuery({
    queryKey: queryKeys.evidence.schema(),
    queryFn: () => evidenceService.getSchema().then(unwrap),
    staleTime: 5 * 60_000,
  });
}

export function useCreateEvidenceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEvidenceInput) => evidenceService.createRecord(input).then(unwrap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evidence.all() }),
  });
}

export function useUpdateEvidenceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEvidenceInput) => evidenceService.updateRecord(input).then(unwrap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evidence.all() }),
  });
}

export function useDeleteEvidenceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rowId: string) => evidenceService.removeRecord(rowId).then(unwrap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evidence.all() }),
  });
}

export function useUploadEvidenceFile() {
  return useMutation({
    mutationFn: (input: UploadEvidenceFileInput) => evidenceService.uploadFile(input).then(unwrap),
  });
}

export function useDeleteEvidenceFile() {
  return useMutation({
    mutationFn: ({ key, options }: { key: string; options?: Record<string, unknown> }) =>
      evidenceService.deleteFile(key, options).then(unwrap),
  });
}

/** Downloads an evidence file and exposes it as a local blob URL for inline preview. */
export function useEvidenceFileUrl(key: string | undefined, enabled: boolean) {
  return useFilePreviewUrl((k) => evidenceService.downloadFile(k), key, enabled);
}
