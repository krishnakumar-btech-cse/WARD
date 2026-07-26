import type { CatalystColumnMeta } from '../../../../types/catalyst-sdk';
import type { CatalystRow } from '../../../../types/catalyst.types';
import type { AIAssistantResponse } from '../../../../types/ai.types';
import type { AICaseContext } from './resolveAIContext';
import {
  findColumnByPattern,
  LABEL_COLUMN_PATTERNS,
  CRIME_TYPE_COLUMN_PATTERNS,
  DISTRICT_COLUMN_PATTERNS,
} from '../../../../shared/lib/utils';

/**
 * These three don't need the AI Function at all — they're plain
 * client-side logic over real case data, so they're genuine, working
 * features today rather than something pretending to be AI. Labeled
 * "computed" (not "AI-generated") in the UI on purpose.
 */

export function computeSimilarCases(
  context: AICaseContext,
  allCases: CatalystRow[],
  caseSchema: CatalystColumnMeta[]
): AIAssistantResponse {
  const titleColumn = findColumnByPattern(caseSchema, LABEL_COLUMN_PATTERNS);
  const crimeTypeColumn = findColumnByPattern(caseSchema, CRIME_TYPE_COLUMN_PATTERNS);
  const districtColumn = findColumnByPattern(caseSchema, DISTRICT_COLUMN_PATTERNS);

  if (!crimeTypeColumn && !districtColumn) {
    return {
      answer: 'This table doesn’t have a crime type or district column to match on yet, so similarity can’t be computed.',
      reasoning: 'Similar-case matching needs at least one shared field (crime type or district) across cases.',
    };
  }

  const scored = allCases
    .filter((row) => row.ROWID !== context.caseId)
    .map((row) => {
      let score = 0;
      const reasons: string[] = [];
      if (crimeTypeColumn && context.crimeType) {
        const value = String(row[crimeTypeColumn.column_name] ?? '');
        if (value && value === context.crimeType) {
          score += 2;
          reasons.push(`same crime type (${value})`);
        }
      }
      if (districtColumn && context.district) {
        const value = String(row[districtColumn.column_name] ?? '');
        if (value && value === context.district) {
          score += 1;
          reasons.push(`same district (${value})`);
        }
      }
      return { row, score, reasons };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) {
    return {
      answer: 'No other cases currently share this case’s crime type or district.',
      reasoning: `Compared against ${allCases.length - 1} other case(s) on crime type and district.`,
    };
  }

  const lines = scored.map((entry) => {
    const title = titleColumn ? String(entry.row[titleColumn.column_name] ?? entry.row.ROWID) : String(entry.row.ROWID);
    return `${title} — ${entry.reasons.join(', ')}`;
  });

  return {
    answer: `Found ${scored.length} case${scored.length === 1 ? '' : 's'} with overlapping characteristics:\n${lines.map((l) => `• ${l}`).join('\n')}`,
    reasoning: `Compared against ${allCases.length - 1} other case(s) on crime type and district — no cross-case text or embedding search involved.`,
    citations: scored.map((entry) => ({
      label: titleColumn ? String(entry.row[titleColumn.column_name] ?? entry.row.ROWID) : String(entry.row.ROWID),
      sourceKind: 'case' as const,
    })),
  };
}

const EVIDENCE_CHECKLIST: { kind: string; suggestion: string }[] = [
  { kind: 'video', suggestion: 'No video evidence yet — consider canvassing for CCTV or dashcam footage.' },
  { kind: 'audio', suggestion: 'No audio evidence yet — consider recording witness or suspect interviews.' },
  { kind: 'image', suggestion: 'No photographic evidence yet — consider photographing the scene or recovered items.' },
  { kind: 'document', suggestion: 'No supporting documents yet — consider requesting official records (RTO, bank, phone).' },
];

export function computeMissingEvidence(context: AICaseContext): AIAssistantResponse {
  if (context.evidence.length === 0) {
    return {
      answer: 'No evidence has been logged for this case yet — start with whatever was collected at the scene.',
      reasoning: 'Zero evidence rows found for this case.',
    };
  }

  const presentKinds = new Set(context.evidence.map((e) => (e.detail ?? '').toLowerCase()));
  const missing = EVIDENCE_CHECKLIST.filter((item) => !presentKinds.has(item.kind));

  if (missing.length === 0) {
    return {
      answer: 'This case already has evidence across all the common categories (image, video, audio, and documents).',
      reasoning: `Checked ${context.evidence.length} evidence item(s) against a standard image/video/audio/document checklist.`,
      citations: context.evidence.slice(0, 3).map((e) => ({ label: e.title, sourceKind: 'evidence' as const })),
    };
  }

  return {
    answer: missing.map((m) => `• ${m.suggestion}`).join('\n'),
    reasoning: `Checked ${context.evidence.length} evidence item(s), categorized by file type, against a standard image/video/audio/document checklist.`,
    citations: context.evidence.slice(0, 3).map((e) => ({ label: e.title, sourceKind: 'evidence' as const })),
  };
}

export function computeNextBestAction(context: AICaseContext): AIAssistantResponse {
  const next = context.pendingTasks[0];
  if (next) {
    return {
      answer: `Next best action: "${next.title}"${next.detail ? ` (assigned to ${next.detail})` : ' (unassigned)'}.`,
      reasoning: `Earliest open task out of ${context.pendingTasks.length} pending task(s) on this case's board.`,
      citations: [{ label: next.title, sourceKind: 'timeline' }],
    };
  }
  if (context.evidence.length === 0) {
    return {
      answer: 'Next best action: log the initial evidence collected at the scene.',
      reasoning: 'No evidence has been recorded for this case yet.',
    };
  }
  if (context.notebook.length === 0) {
    return {
      answer: 'Next best action: capture your initial scene assessment in the Notebook.',
      reasoning: 'No notebook entries exist for this case yet, and evidence has already been logged.',
    };
  }
  return {
    answer: 'No open tasks are outstanding — review the case with the investigation team to decide next steps.',
    reasoning: `${context.evidence.length} evidence item(s) and ${context.notebook.length} notebook entr${context.notebook.length === 1 ? 'y' : 'ies'} logged, with no pending tasks.`,
  };
}
