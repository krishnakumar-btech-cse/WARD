import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, NotebookPen, History, Folder } from 'lucide-react';
import { Badge } from '../../../../shared/components/ui/badge';
import { cn } from '../../../../shared/lib/utils';
import type { AICitation, AIAssistantResponse } from '../../../../types/ai.types';

export type AIMessageOrigin = 'real' | 'sample' | 'computed';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text?: string;
  response?: AIAssistantResponse;
  origin?: AIMessageOrigin;
}

const CITATION_ICON: Record<AICitation['sourceKind'], typeof FileText> = {
  evidence: FileText,
  notebook: NotebookPen,
  timeline: History,
  case: Folder,
};

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 80 ? 'bg-success' : pct >= 55 ? 'bg-warning' : 'bg-critical';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}% confidence</span>
    </div>
  );
}

function AssistantContent({ response, origin }: { response: AIAssistantResponse; origin: AIMessageOrigin }) {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="max-w-[85%] space-y-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
      <div className="flex items-center gap-2">
        {origin === 'sample' && <Badge variant="warning">Sample</Badge>}
        {origin === 'computed' && <Badge variant="primary">Computed from case data</Badge>}
      </div>

      <p className="whitespace-pre-wrap">{response.answer}</p>

      {response.confidence !== undefined && <ConfidenceMeter value={response.confidence} />}

      {response.citations && response.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {response.citations.map((citation, index) => {
            const Icon = CITATION_ICON[citation.sourceKind];
            return (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                <Icon className="h-3 w-3" />
                {citation.label}
              </span>
            );
          })}
        </div>
      )}

      {response.reasoning && (
        <div>
          <button
            type="button"
            onClick={() => setShowReasoning((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Reasoning
          </button>
          {showReasoning && <p className="mt-1 text-xs text-muted-foreground">{response.reasoning}</p>}
        </div>
      )}
    </div>
  );
}

export function AIMessageBubble({ message }: { message: AIMessage }) {
  if (message.role === 'user') {
    return <div className="ml-auto max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{message.text}</div>;
  }

  if (message.role === 'error') {
    return (
      <div className="max-w-[85%] rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical">
        {message.text}
      </div>
    );
  }

  if (message.response) {
    return <AssistantContent response={message.response} origin={message.origin ?? 'real'} />;
  }

  return null;
}
