import { useEffect, useState } from 'react';
import type { ApiResult } from '../utils/apiResponse';

/**
 * Downloads a Stratus object via the given download function and exposes it
 * as a local blob URL for inline preview (image/video/audio/PDF). Not a
 * TanStack Query hook on purpose — the object URL is a browser resource
 * tied to this component's lifetime and must be revoked on cleanup, which
 * doesn't fit the query cache model. Shared by every file-attached resource
 * (Evidence, Notebook, ...) instead of each re-implementing blob handling.
 */
export function useFilePreviewUrl(
  downloadFile: (key: string) => Promise<ApiResult<unknown>>,
  key: string | undefined,
  enabled: boolean
) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUrl(null);
    setError(null);

    if (!key || !enabled) return;

    let objectUrl: string | null = null;
    let cancelled = false;
    setIsLoading(true);

    downloadFile(key).then((result) => {
      if (cancelled) return;
      setIsLoading(false);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      const data = result.data;
      const blob =
        data instanceof Blob
          ? data
          : data instanceof ArrayBuffer
            ? new Blob([data])
            : ArrayBuffer.isView(data)
              ? new Blob([data.buffer as ArrayBuffer])
              : null;

      if (!blob) {
        setError('Preview is not available for this file.');
        return;
      }

      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // downloadFile is intentionally excluded: callers pass a fresh arrow each
    // render (e.g. (k) => service.downloadFile(k)), and it always closes over
    // the same stable service singleton, so re-running on identity change
    // would just refetch the same file on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { url, error, isLoading };
}
