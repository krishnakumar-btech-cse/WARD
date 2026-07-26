import type { CatalystApiError } from './apiError';

/** Uniform success/failure envelope returned by every service method. */
export type ApiResult<T> = { success: true; data: T } | { success: false; error: CatalystApiError };

export function ok<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

export function fail<T = never>(error: CatalystApiError): ApiResult<T> {
  return { success: false, error };
}

/** Unwraps an ApiResult for call sites (e.g. TanStack Query queryFn) that want to throw on failure. */
export function unwrap<T>(result: ApiResult<T>): T {
  if (result.success) return result.data;
  throw result.error;
}
