import { useState } from 'react';
import { cn } from '../../shared/lib/utils';
import { CaseReport } from './CaseReport';
import { CrimePatternReport } from './CrimePatternReport';
import { CommandBriefingReport } from './CommandBriefingReport';

const REPORT_TYPES = [
  { id: 'case', label: 'Case Report' },
  { id: 'crime-pattern', label: 'Crime Pattern Summary' },
  { id: 'command-briefing', label: 'Command Briefing' },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]['id'];

/**
 * A dedicated export hub, separate from the interactive Dashboard/Analytics/
 * Case Workspace pages those reports summarize — the job here is
 * print/PDF/CSV output, not exploration. Every figure comes from the same
 * real computation functions those other pages already use.
 */
export function ReportsPage() {
  const [activeType, setActiveType] = useState<ReportType>('case');

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-xl font-semibold tracking-tight">Reports &amp; Intelligence Export</h1>
        <p className="text-sm text-muted-foreground">Printable, exportable reports built from the same real data as the rest of WARD.</p>
      </div>

      <div className="border-b border-border print:hidden">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setActiveType(type.id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                activeType === type.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {type.label}
            </button>
          ))}
        </nav>
      </div>

      {activeType === 'case' && <CaseReport />}
      {activeType === 'crime-pattern' && <CrimePatternReport />}
      {activeType === 'command-briefing' && <CommandBriefingReport />}
    </div>
  );
}
