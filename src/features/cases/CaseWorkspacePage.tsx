import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useCase, useCaseSchema } from '../../hooks/useCases';
import { CASES_DEMO } from '../../shared/lib/demoData';
import { findColumnByPattern, cn } from '../../shared/lib/utils';
import { OverviewTab } from './tabs/OverviewTab';
import { EvidenceTab } from './tabs/EvidenceTab';
import { NotebookTab } from './tabs/NotebookTab';
import { TimelineTab } from './tabs/TimelineTab';
import { BoardTab } from './tabs/BoardTab';
import { AIAnalystTab } from './tabs/AIAnalystTab';

const TITLE_COLUMN_PATTERNS = [/^title$/i, /case.?title/i, /^name$/i, /case.?name/i];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'board', label: 'Workspace Board' },
  { id: 'ai', label: 'AI Analyst' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * The single investigation workspace for one case — Overview, Evidence,
 * Notebook, Timeline, the board, and the AI Analyst all live as tabs here
 * rather than separate pages, per the "single investigation workspace"
 * design principle.
 */
export function CaseWorkspacePage() {
  const { caseId = '' } = useParams<{ caseId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const isDemoCase = caseId.startsWith('demo-');
  const demoCase = isDemoCase ? CASES_DEMO.rows.find((r) => r.ROWID === caseId) : undefined;
  const { data: realCase } = useCase(caseId);
  const { data: realSchema } = useCaseSchema();

  const caseRecord = isDemoCase ? demoCase : realCase;
  // realSchema is typed as an array, but an unauthenticated/failed request
  // can resolve successfully with malformed content instead of rejecting.
  const schema = isDemoCase ? CASES_DEMO.schema : Array.isArray(realSchema) ? realSchema : undefined;
  const titleColumn = schema ? findColumnByPattern(schema, TITLE_COLUMN_PATTERNS) : undefined;
  const title = titleColumn && caseRecord ? String(caseRecord[titleColumn.column_name] ?? '') : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/cases"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Cases
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{title || `Case ${caseId}`}</h1>
      </div>

      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && <OverviewTab caseId={caseId} onViewTimeline={() => setActiveTab('timeline')} />}
      {activeTab === 'evidence' && <EvidenceTab caseId={caseId} />}
      {activeTab === 'notebook' && <NotebookTab caseId={caseId} />}
      {activeTab === 'timeline' && <TimelineTab caseId={caseId} />}
      {activeTab === 'board' && <BoardTab caseId={caseId} />}
      {activeTab === 'ai' && <AIAnalystTab caseId={caseId} />}
    </div>
  );
}
