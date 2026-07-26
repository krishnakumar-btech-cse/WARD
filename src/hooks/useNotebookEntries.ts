import { useMutation } from '@tanstack/react-query';
import { createCrudHooks } from './createCrudHooks';
import { useFilePreviewUrl } from './useFilePreviewUrl';
import { notebookService } from '../services/notebookService';
import { queryKeys } from '../utils/queryKeys';
import { unwrap } from '../utils/apiResponse';
import type { UploadFileInput } from '../services/resourceServiceTypes';
import type { NotebookEntryRecord } from '../types/notebook.types';

export const {
  useList: useNotebookEntries,
  useItem: useNotebookEntry,
  useSchema: useNotebookEntrySchema,
  useCreate: useCreateNotebookEntry,
  useUpdate: useUpdateNotebookEntry,
  useRemove: useDeleteNotebookEntry,
} = createCrudHooks<NotebookEntryRecord>(notebookService, queryKeys.notebookEntries);

export function useUploadNotebookFile() {
  return useMutation({
    mutationFn: (input: UploadFileInput) => notebookService.uploadFile(input).then(unwrap),
  });
}

/** Downloads a notebook attachment and exposes it as a local blob URL for inline preview. */
export function useNotebookFileUrl(key: string | undefined, enabled: boolean) {
  return useFilePreviewUrl((k) => notebookService.downloadFile(k), key, enabled);
}
