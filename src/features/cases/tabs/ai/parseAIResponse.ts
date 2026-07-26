import type { AIAssistantResponse, AICitation } from '../../../../types/ai.types';

/** Coerces whatever the real Function eventually returns into the UI's expected response shape. */
export function parseAIResponse(raw: unknown): AIAssistantResponse {
  if (typeof raw === 'string') return { answer: raw };

  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    return {
      answer:
        typeof r.answer === 'string'
          ? r.answer
          : typeof r.message === 'string'
            ? r.message
            : typeof r.text === 'string'
              ? r.text
              : JSON.stringify(raw),
      reasoning: typeof r.reasoning === 'string' ? r.reasoning : undefined,
      confidence: typeof r.confidence === 'number' ? r.confidence : undefined,
      citations: Array.isArray(r.citations) ? (r.citations as AICitation[]) : undefined,
    };
  }

  return { answer: String(raw) };
}
