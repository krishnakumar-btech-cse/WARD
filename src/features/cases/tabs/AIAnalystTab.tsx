import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useCase, useCaseSchema, useCases } from '../../../hooks/useCases';
import { useEvidenceList, useEvidenceSchema } from '../../../hooks/useEvidence';
import { useNotebookEntries, useNotebookEntrySchema } from '../../../hooks/useNotebookEntries';
import { useCaseTasks, useCaseTaskSchema } from '../../../hooks/useCaseTasks';
import { useResolvedTable } from '../../../hooks/useResolvedTable';
import { useInvokeAI } from '../../../hooks/useAI';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Textarea } from '../../../shared/components/ui/textarea';
import { Skeleton } from '../../../shared/components/ui/skeleton';
import { CASES_DEMO, EVIDENCE_DEMO, NOTEBOOK_ENTRIES_DEMO, CASE_TASKS_DEMO } from '../../../shared/lib/demoData';
import { resolveAIContext } from './ai/resolveAIContext';
import { computeSimilarCases, computeMissingEvidence, computeNextBestAction } from './ai/computeHeuristics';
import { sampleCaseSummary, sampleEvidenceSummary, sampleInvestigationSuggestions, sampleFreeformAnswer } from './ai/sampleAIResponses';
import { parseAIResponse } from './ai/parseAIResponse';
import { AIMessageBubble, type AIMessage } from './ai/AIMessageBubble';
import type { CaseRecord } from '../../../types/case.types';

type QuickActionKind =
  | 'case-summary'
  | 'evidence-summary'
  | 'similar-cases'
  | 'investigation-suggestions'
  | 'missing-evidence'
  | 'next-best-action';

const QUICK_ACTIONS: { kind: QuickActionKind; label: string; query: string; computed: boolean }[] = [
  { kind: 'case-summary', label: 'Case Summary', query: 'Summarize this case.', computed: false },
  { kind: 'evidence-summary', label: 'Evidence Summary', query: 'Summarize the evidence collected so far.', computed: false },
  { kind: 'similar-cases', label: 'Similar Cases', query: 'Are there similar cases to this one?', computed: true },
  { kind: 'investigation-suggestions', label: 'Investigation Suggestions', query: 'What should we investigate next?', computed: false },
  { kind: 'missing-evidence', label: 'Missing Evidence', query: 'What evidence might be missing?', computed: true },
  { kind: 'next-best-action', label: 'Next Best Action', query: 'What is the next best action?', computed: true },
];

let messageSeq = 0;
function nextId() {
  messageSeq += 1;
  return `msg-${messageSeq}`;
}

/**
 * Similar Cases / Missing Evidence / Next Best Action are computed straight
 * from this case's real data — no Function needed, so they're genuine
 * working features, not a preview. Case Summary / Evidence Summary /
 * Investigation Suggestions / free-form questions need real language
 * generation and reasoning, which nothing here fakes: they're sent to the
 * AI Function, and only fall back to a clearly-labeled, case-grounded
 * sample when that Function isn't deployed yet.
 */
export function AIAnalystTab({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [draft, setDraft] = useState('');

  const isDemoCase = caseId.startsWith('demo-');
  const demoCase = isDemoCase ? (CASES_DEMO.rows.find((r) => r.ROWID === caseId) as CaseRecord | undefined) : undefined;
  const realCaseQuery = useCase(caseId);
  const realCaseSchemaQuery = useCaseSchema();
  const caseRecord = isDemoCase ? demoCase : realCaseQuery.data;
  // realCaseSchemaQuery.data is typed as an array, but an unauthenticated/
  // failed request can resolve successfully with malformed content instead
  // of rejecting, so this re-validates at runtime rather than trusting the type.
  const caseSchema = isDemoCase ? CASES_DEMO.schema : Array.isArray(realCaseSchemaQuery.data) ? realCaseSchemaQuery.data : [];

  const allCases = useResolvedTable(useCases, useCaseSchema, CASES_DEMO);
  const evidence = useResolvedTable(useEvidenceList, useEvidenceSchema, EVIDENCE_DEMO);
  const notebook = useResolvedTable(useNotebookEntries, useNotebookEntrySchema, NOTEBOOK_ENTRIES_DEMO);
  const tasks = useResolvedTable(useCaseTasks, useCaseTaskSchema, CASE_TASKS_DEMO);

  const { mutate: invokeAI, isPending } = useInvokeAI();

  const isLoading =
    (!isDemoCase && (realCaseQuery.isPending || realCaseSchemaQuery.isPending)) ||
    evidence.isPending ||
    notebook.isPending ||
    allCases.isPending ||
    tasks.isPending;

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const context = resolveAIContext({ caseId, isDemoCase, caseRecord, caseSchema, evidence, notebook, tasks });

  function pushMessage(message: Omit<AIMessage, 'id'>) {
    setMessages((prev) => [...prev, { ...message, id: nextId() }]);
  }

  function runComputedAction(kind: 'similar-cases' | 'missing-evidence' | 'next-best-action') {
    const response =
      kind === 'similar-cases'
        ? computeSimilarCases(context, allCases.rows, allCases.columns)
        : kind === 'missing-evidence'
          ? computeMissingEvidence(context)
          : computeNextBestAction(context);
    pushMessage({ role: 'assistant', response, origin: 'computed' });
  }

  function runAIAction(kind: Exclude<QuickActionKind, 'similar-cases' | 'missing-evidence' | 'next-best-action'>, query: string) {
    invokeAI(
      { payload: { query, caseId, context } },
      {
        onSuccess: (raw) => pushMessage({ role: 'assistant', response: parseAIResponse(raw), origin: 'real' }),
        onError: () => {
          const sample =
            kind === 'case-summary'
              ? sampleCaseSummary(context)
              : kind === 'evidence-summary'
                ? sampleEvidenceSummary(context)
                : sampleInvestigationSuggestions(context);
          pushMessage({ role: 'assistant', response: sample, origin: 'sample' });
        },
      }
    );
  }

  function handleQuickAction(kind: QuickActionKind) {
    const action = QUICK_ACTIONS.find((a) => a.kind === kind)!;
    pushMessage({ role: 'user', text: action.label });
    if (kind === 'similar-cases' || kind === 'missing-evidence' || kind === 'next-best-action') {
      runComputedAction(kind);
    } else {
      runAIAction(kind, action.query);
    }
  }

  function handleSend() {
    const question = draft.trim();
    if (!question) return;
    pushMessage({ role: 'user', text: question });
    setDraft('');

    invokeAI(
      { payload: { query: question, caseId, context } },
      {
        onSuccess: (raw) => pushMessage({ role: 'assistant', response: parseAIResponse(raw), origin: 'real' }),
        onError: () => pushMessage({ role: 'assistant', response: sampleFreeformAnswer(question, context), origin: 'sample' }),
      }
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold tracking-tight">AI Investigation Assistant</h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <Button key={action.kind} variant="outline" size="sm" onClick={() => handleQuickAction(action.kind)} disabled={isPending}>
            {action.label}
          </Button>
        ))}
      </div>

      <div className="min-h-[240px] space-y-3 rounded-lg border border-border bg-card p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Use a quick action above, or ask a free-form question about this case.
          </p>
        )}
        {messages.map((message) => (
          <AIMessageBubble key={message.id} message={message} />
        ))}
        {isPending && <p className="text-xs text-muted-foreground">Thinking…</p>}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask the AI Analyst about this case…"
          className="min-h-[44px] flex-1"
        />
        <Button onClick={handleSend} disabled={isPending || !draft.trim()}>
          {isPending ? 'Asking…' : 'Ask'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        <Badge variant="warning" className="mr-1.5">
          Not connected
        </Badge>
        Case Summary, Evidence Summary, Investigation Suggestions, and free-form questions show a sample response until
        the AI Function is deployed. Similar Cases, Missing Evidence, and Next Best Action are computed directly from
        this case's data and work today.
      </p>
    </div>
  );
}
