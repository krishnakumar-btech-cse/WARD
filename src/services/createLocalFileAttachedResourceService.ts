import { createLocalResourceService } from './createLocalResourceService';
import { localFileStore } from './localFileStore';
import { ok, fail, type ApiResult } from '../utils/apiResponse';
import { CatalystApiError } from '../utils/apiError';
import type { FileAttachedResourceService, UploadFileInput } from './resourceServiceTypes';
import type { CatalystRow } from '../types/catalyst.types';
import type { DemoDataset } from '../shared/lib/demoData';

async function guarded<R>(op: () => Promise<R>): Promise<ApiResult<R>> {
  try {
    return ok(await op());
  } catch (error) {
    return fail(new CatalystApiError({ message: error instanceof Error ? error.message : 'Local demo file error', code: 'REQUEST_FAILED' }));
  }
}

/** Seeded demo media lives as static files under public/demo-assets — fetched directly rather than looked up in IndexedDB. */
function isStaticAssetKey(key: string): boolean {
  return key.startsWith('demo-assets/') || key.startsWith('/demo-assets/');
}

function toAssetUrl(key: string): string {
  return key.startsWith('/') ? key : `/${key}`;
}

/** Builds a FileAttachedResourceService<T> — localDb for row metadata, localFileStore/IndexedDB for uploaded bytes. */
export function createLocalFileAttachedResourceService<T extends CatalystRow>(
  table: string,
  seed: DemoDataset
): FileAttachedResourceService<T> {
  const base = createLocalResourceService<T>(table, seed);

  return {
    ...base,
    uploadFile: ({ key, file }: UploadFileInput) =>
      guarded(async () => {
        const blob = file instanceof Blob ? file : new Blob([file]);
        await localFileStore.put(key, blob);
        return true;
      }),
    downloadFile: (key: string) =>
      guarded(async () => {
        if (isStaticAssetKey(key)) {
          const response = await fetch(toAssetUrl(key));
          if (!response.ok) throw new Error(`Demo asset not found: ${key}`);
          return response.blob();
        }
        const blob = await localFileStore.get(key);
        if (!blob) throw new Error(`No local file stored for key "${key}".`);
        return blob;
      }),
    deleteFile: (key: string) =>
      guarded(async () => {
        if (!isStaticAssetKey(key)) await localFileStore.remove(key);
        return true;
      }),
  };
}
