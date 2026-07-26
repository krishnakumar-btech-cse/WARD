/**
 * No AI endpoint shape is assumed — Catalyst Functions for AI features are
 * added later. This describes only the generic function-execute contract.
 */
export interface AIInvokeOptions {
  /** Overrides VITE_CATALYST_FUNCTION_AI for one-off calls to a different function. */
  functionId?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload?: BodyInit | Record<string, unknown> | null;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
}

/**
 * The response shape the eventual aiAnalystQuery Function is expected to
 * return — not enforced by the SDK (it truly doesn't exist yet), but this
 * is the contract the UI is built against so the rich rendering (reasoning,
 * confidence, citations) works the moment it's deployed.
 */
export interface AICitation {
  label: string;
  sourceKind: 'evidence' | 'notebook' | 'timeline' | 'case';
}

export interface AIAssistantResponse {
  answer: string;
  reasoning?: string;
  /** 0–1 */
  confidence?: number;
  citations?: AICitation[];
}
