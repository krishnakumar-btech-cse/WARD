export type CatalystErrorCode =
  | 'SDK_NOT_READY'
  | 'NOT_AUTHENTICATED'
  | 'REQUEST_FAILED'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN';

export interface CatalystApiErrorOptions {
  message: string;
  code?: CatalystErrorCode;
  status?: number;
  cause?: unknown;
  details?: unknown;
}

/** Normalized error shape every service method surfaces via ApiResult. */
export class CatalystApiError extends Error {
  readonly code: CatalystErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor({ message, code = 'UNKNOWN', status, cause, details }: CatalystApiErrorOptions) {
    super(message);
    this.name = 'CatalystApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, CatalystApiError.prototype);
  }
}

/** Collapses whatever the SDK/fetch/JS runtime throws into a CatalystApiError. */
export function normalizeCatalystError(error: unknown): CatalystApiError {
  if (error instanceof CatalystApiError) {
    return error;
  }

  if (error instanceof Response) {
    return new CatalystApiError({
      message: `Catalyst request failed with status ${error.status}`,
      code: error.status === 401 || error.status === 403 ? 'NOT_AUTHENTICATED' : 'REQUEST_FAILED',
      status: error.status,
    });
  }

  if (error && typeof error === 'object') {
    const maybe = error as { message?: string; status?: number; code?: string };
    return new CatalystApiError({
      message: maybe.message ?? 'Catalyst request failed',
      code: maybe.status === 401 || maybe.status === 403 ? 'NOT_AUTHENTICATED' : 'REQUEST_FAILED',
      status: maybe.status,
      details: error,
    });
  }

  if (error instanceof Error) {
    return new CatalystApiError({ message: error.message, code: 'UNKNOWN', cause: error });
  }

  return new CatalystApiError({ message: 'An unknown Catalyst error occurred', code: 'UNKNOWN', details: error });
}
