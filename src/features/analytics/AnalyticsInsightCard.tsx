import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../../shared/components/ui/button';
import { Badge } from '../../shared/components/ui/badge';
import { useInvokeAI } from '../../hooks/useAI';
import { parseAIResponse } from '../cases/tabs/ai/parseAIResponse';
import type { AIAssistantResponse } from '../../types/ai.types';

export function AnalyticsInsightCard({
  title,
  description,
  action,
  sample,
}: {
  title: string;
  description: string;
  action: string;
  sample: AIAssistantResponse;
}) {
  const [result, setResult] = useState<{ response: AIAssistantResponse; isSample: boolean } | null>(null);
  const { mutate: invokeAI, isPending } = useInvokeAI();

  function handleGenerate() {
    invokeAI(
      { payload: { action, context: sample } },
      {
        onSuccess: (raw) => setResult({ response: parseAIResponse(raw), isSample: false }),
        onError: () => setResult({ response: sample, isSample: true }),
      }
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {result?.isSample && <Badge variant="warning">Sample</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {!result && (
        <Button variant="outline" size="sm" className="mt-3" onClick={handleGenerate} disabled={isPending}>
          <Sparkles className="h-4 w-4" />
          {isPending ? 'Generating…' : 'Generate insight'}
        </Button>
      )}

      {result && (
        <div className="mt-3 space-y-1.5 rounded-md bg-muted p-3 text-sm text-foreground">
          <p>{result.response.answer}</p>
          {result.response.reasoning && <p className="text-xs text-muted-foreground">{result.response.reasoning}</p>}
        </div>
      )}
    </div>
  );
}
