import type { AIAssistantResponse } from '../../../../types/ai.types';
import type { AICaseContext } from './resolveAIContext';

/**
 * These four genuinely need the AI Function — natural-language summarization
 * and open-ended reasoning aren't things to fake with client logic. What's
 * below is a clearly-labeled sample of the response shape (answer +
 * reasoning + confidence + citations), grounded in this case's real data so
 * it's not a placeholder — but it is a sample, and the UI says so.
 */

export function sampleCaseSummary(context: AICaseContext): AIAssistantResponse {
  const parts = [
    context.crimeType ? `a ${context.crimeType.toLowerCase()} case` : 'a case',
    context.status ? `currently ${context.status.toLowerCase()}` : undefined,
    context.priority ? `at ${context.priority.toLowerCase()} priority` : undefined,
    context.district ? `in the ${context.district} district` : undefined,
  ].filter(Boolean);

  const answer = [
    `${context.title} is ${parts.join(', ')}.`,
    context.description,
    `${context.evidence.length} evidence item${context.evidence.length === 1 ? '' : 's'} and ${context.notebook.length} notebook entr${context.notebook.length === 1 ? 'y' : 'ies'} have been logged so far.`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    answer,
    reasoning: 'Would synthesize the case record, evidence library, and notebook into a narrative summary.',
    confidence: 0.86,
    citations: [
      { label: context.title, sourceKind: 'case' },
      ...context.evidence.slice(0, 2).map((e) => ({ label: e.title, sourceKind: 'evidence' as const })),
    ],
  };
}

export function sampleEvidenceSummary(context: AICaseContext): AIAssistantResponse {
  if (context.evidence.length === 0) {
    return {
      answer: 'No evidence has been logged for this case yet, so there’s nothing to summarize.',
      reasoning: 'Evidence library is empty for this case.',
    };
  }

  const list = context.evidence.map((e) => `${e.title}${e.detail ? ` (${e.detail})` : ''}`).join('; ');

  return {
    answer: `This case has ${context.evidence.length} evidence item${context.evidence.length === 1 ? '' : 's'}: ${list}. Would normally cross-reference OCR text, transcripts, and AI summaries across all items into one narrative.`,
    reasoning: 'Would read each evidence item’s OCR/transcript/AI summary fields and synthesize a cross-referenced narrative.',
    confidence: 0.81,
    citations: context.evidence.map((e) => ({ label: e.title, sourceKind: 'evidence' as const })),
  };
}

export function sampleInvestigationSuggestions(context: AICaseContext): AIAssistantResponse {
  const taskNote =
    context.pendingTasks.length > 0
      ? `${context.pendingTasks.length} task${context.pendingTasks.length === 1 ? ' is' : 's are'} already open.`
      : 'No tasks are currently open.';

  return {
    answer: `Based on the ${context.evidence.length} evidence item(s) and ${context.notebook.length} notebook entr${context.notebook.length === 1 ? 'y' : 'ies'} logged, would recommend prioritizing corroboration of witness accounts against physical evidence and closing timeline gaps around the incident window. ${taskNote}`,
    reasoning: 'Would reason over evidence, notebook findings, and the case timeline to identify investigative gaps and priorities.',
    confidence: 0.74,
    citations: context.notebook.slice(0, 2).map((n) => ({ label: n.title, sourceKind: 'notebook' as const })),
  };
}

export function sampleFreeformAnswer(question: string, context: AICaseContext): AIAssistantResponse {
  return {
    answer: `Once connected, the AI Analyst would answer "${question}" using ${context.title}'s case record, ${context.evidence.length} evidence item(s), and ${context.notebook.length} notebook entr${context.notebook.length === 1 ? 'y' : 'ies'} as grounding context.`,
    reasoning: 'Open-ended questions are routed to the Function with the full case context attached.',
    confidence: 0.6,
  };
}
