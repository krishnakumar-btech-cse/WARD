import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useCases, useCaseSchema } from '../../hooks/useCases';
import { useCaseAssignments, useCaseAssignmentSchema } from '../../hooks/useCaseAssignments';
import { useEvidenceList, useEvidenceSchema } from '../../hooks/useEvidence';
import { useNotebookEntries, useNotebookEntrySchema } from '../../hooks/useNotebookEntries';
import { useHypotheses, useHypothesisSchema } from '../../hooks/useHypotheses';
import { useTimelineEvents, useTimelineEventSchema } from '../../hooks/useTimelineEvents';
import { useResolvedTable } from '../../hooks/useResolvedTable';
import {
  CASES_DEMO,
  CASE_ASSIGNMENTS_DEMO,
  EVIDENCE_DEMO,
  NOTEBOOK_ENTRIES_DEMO,
  CASE_HYPOTHESES_DEMO,
  TIMELINE_EVENTS_DEMO,
} from '../../shared/lib/demoData';
import { scopeToCase } from '../../shared/lib/scopeToCase';
import { resolveTimelineFeed } from '../cases/tabs/timeline/resolveTimelineFeed';
import { ReportHeader, ReportDocument } from './ReportHeader';
import { Badge } from '../../shared/components/ui/badge';
import { Button } from '../../shared/components/ui/button';
import { Skeleton } from '../../shared/components/ui/skeleton';
import { downloadCsv } from '../../shared/lib/exportCsv';
import {
  SYSTEM_COLUMN_NAMES,
  STATUS_COLUMN_PATTERNS,
  PRIORITY_COLUMN_PATTERNS,
  LABEL_COLUMN_PATTERNS,
  OFFICER_NAME_COLUMN_PATTERNS,
  EVIDENCE_TITLE_COLUMN_PATTERNS,
  FILE_TYPE_COLUMN_PATTERNS,
  AI_SUMMARY_COLUMN_PATTERNS,
  BOOKMARK_COLUMN_PATTERNS,
  KEY_FINDING_COLUMN_PATTERNS,
  CONTENT_COLUMN_PATTERNS,
  findColumnByPattern,
  formatCellValue,
  toFieldLabel,
  statusTone,
  priorityTone,
} from '../../shared/lib/utils';

export function CaseReport() {
  const cases = useResolvedTable(useCases, useCaseSchema, CASES_DEMO);
  const assignments = useResolvedTable(useCaseAssignments, useCaseAssignmentSchema, CASE_ASSIGNMENTS_DEMO);
  const evidence = useResolvedTable(useEvidenceList, useEvidenceSchema, EVIDENCE_DEMO);
  const notebook = useResolvedTable(useNotebookEntries, useNotebookEntrySchema, NOTEBOOK_ENTRIES_DEMO);
  const hypotheses = useResolvedTable(useHypotheses, useHypothesisSchema, CASE_HYPOTHESES_DEMO);
  const timelineEvents = useResolvedTable(useTimelineEvents, useTimelineEventSchema, TIMELINE_EVENTS_DEMO);

  const [selectedCaseId, setSelectedCaseId] = useState('');

  const titleColumn = useMemo(() => findColumnByPattern(cases.columns, LABEL_COLUMN_PATTERNS), [cases.columns]);
  const statusColumn = useMemo(() => findColumnByPattern(cases.columns, STATUS_COLUMN_PATTERNS), [cases.columns]);
  const priorityColumn = useMemo(() => findColumnByPattern(cases.columns, PRIORITY_COLUMN_PATTERNS), [cases.columns]);

  const caseId = selectedCaseId || cases.rows[0]?.ROWID || '';
  const caseRecord = useMemo(() => cases.rows.find((r) => r.ROWID === caseId), [cases.rows, caseId]);

  const caseAssignments = useMemo(() => scopeToCase(assignments, caseId), [assignments, caseId]);
  const caseEvidence = useMemo(() => scopeToCase(evidence, caseId), [evidence, caseId]);
  const caseNotebook = useMemo(() => scopeToCase(notebook, caseId), [notebook, caseId]);
  const caseHypotheses = useMemo(() => scopeToCase(hypotheses, caseId), [hypotheses, caseId]);

  const officerColumn = useMemo(() => findColumnByPattern(assignments.columns, OFFICER_NAME_COLUMN_PATTERNS), [assignments.columns]);
  const roleColumn = useMemo(() => findColumnByPattern(assignments.columns, [/^role$/i]), [assignments.columns]);

  const evidenceTitleColumn = useMemo(() => findColumnByPattern(evidence.columns, EVIDENCE_TITLE_COLUMN_PATTERNS), [evidence.columns]);
  const evidenceTypeColumn = useMemo(() => findColumnByPattern(evidence.columns, FILE_TYPE_COLUMN_PATTERNS), [evidence.columns]);
  const evidenceSummaryColumn = useMemo(() => findColumnByPattern(evidence.columns, AI_SUMMARY_COLUMN_PATTERNS), [evidence.columns]);

  const notebookTitleColumn = useMemo(() => findColumnByPattern(notebook.columns, LABEL_COLUMN_PATTERNS), [notebook.columns]);
  const notebookContentColumn = useMemo(() => findColumnByPattern(notebook.columns, CONTENT_COLUMN_PATTERNS), [notebook.columns]);
  const bookmarkColumn = useMemo(() => findColumnByPattern(notebook.columns, BOOKMARK_COLUMN_PATTERNS), [notebook.columns]);
  const keyFindingColumn = useMemo(() => findColumnByPattern(notebook.columns, KEY_FINDING_COLUMN_PATTERNS), [notebook.columns]);
  const keyFindings = useMemo(
    () =>
      caseNotebook.filter((row) => {
        const isBookmarked = bookmarkColumn ? Boolean(row[bookmarkColumn.column_name]) : false;
        const isKeyFinding = keyFindingColumn ? Boolean(row[keyFindingColumn.column_name]) : false;
        return isBookmarked || isKeyFinding;
      }),
    [caseNotebook, bookmarkColumn, keyFindingColumn]
  );

  const isDemoCase = caseId.startsWith('demo-');
  const timeline = useMemo(
    () =>
      resolveTimelineFeed({
        caseId,
        isDemoCase,
        caseRecord,
        assignments,
        evidence,
        notebook,
        timelineEvents,
      })
        .slice()
        .reverse(),
    [caseId, isDemoCase, caseRecord, assignments, evidence, notebook, timelineEvents]
  );

  const anyDemo = cases.isDemo || assignments.isDemo || evidence.isDemo || notebook.isDemo || hypotheses.isDemo || timelineEvents.isDemo;
  const title = titleColumn && caseRecord ? String(caseRecord[titleColumn.column_name] ?? '') : caseId;

  const displayColumns = (cases.columns ?? []).filter(
    (c) => !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()) && c.column_id !== statusColumn?.column_id && c.column_id !== priorityColumn?.column_id
  );

  function exportEvidenceCsv() {
    downloadCsv(
      `case-${caseId}-evidence.csv`,
      [
        { key: 'title', header: 'Title' },
        { key: 'type', header: 'Type' },
        { key: 'uploaded', header: 'Uploaded' },
      ],
      caseEvidence.map((row) => ({
        title: evidenceTitleColumn ? row[evidenceTitleColumn.column_name] : row.ROWID,
        type: evidenceTypeColumn ? row[evidenceTypeColumn.column_name] : '',
        uploaded: row.CREATEDTIME ?? '',
      }))
    );
  }

  function exportTimelineCsv() {
    downloadCsv(
      `case-${caseId}-timeline.csv`,
      [
        { key: 'occurredAt', header: 'Occurred At' },
        { key: 'kind', header: 'Kind' },
        { key: 'title', header: 'Event' },
        { key: 'description', header: 'Description' },
      ],
      timeline.map((event) => ({
        occurredAt: event.occurredAt,
        kind: event.kind,
        title: event.title,
        description: event.description ?? '',
      }))
    );
  }

  if (cases.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (cases.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No cases available to report on yet.</p>;
  }

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Case Investigation Report"
        description="A single case's full record — details, evidence, key findings, and chronology — ready to print or export."
        isDemo={anyDemo}
        actions={
          <>
            <select
              aria-label="Select case"
              value={caseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="h-8 rounded-md border border-border bg-transparent px-2 text-sm"
            >
              {cases.rows.map((row) => (
                <option key={row.ROWID} value={row.ROWID}>
                  {titleColumn ? String(row[titleColumn.column_name] ?? row.ROWID) : row.ROWID}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={exportEvidenceCsv}>
              <Download className="h-4 w-4" />
              Evidence CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportTimelineCsv}>
              <Download className="h-4 w-4" />
              Timeline CSV
            </Button>
          </>
        }
      />

      <ReportDocument
        title={title}
        generatedNote={`Generated ${new Date().toLocaleString()}${anyDemo ? ' · Sample data' : ''}`}
      >
        <section>
          <div className="flex flex-wrap items-center gap-3">
            {statusColumn && caseRecord && <Badge variant={statusTone(caseRecord[statusColumn.column_name])}>{formatCellValue(caseRecord[statusColumn.column_name])}</Badge>}
            {priorityColumn && caseRecord && <Badge variant={priorityTone(caseRecord[priorityColumn.column_name])}>{formatCellValue(caseRecord[priorityColumn.column_name])} priority</Badge>}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {displayColumns.map((column) => (
              <div key={column.column_id}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{toFieldLabel(column.column_name)}</dt>
                <dd className="mt-0.5 text-sm text-foreground">{caseRecord ? formatCellValue(caseRecord[column.column_name]) : '—'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Assigned officers</h3>
          {caseAssignments.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No officers assigned.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {caseAssignments.map((row) => (
                <li key={row.ROWID} className="text-foreground">
                  {officerColumn ? String(row[officerColumn.column_name] ?? '') : row.ROWID}
                  {roleColumn && row[roleColumn.column_name] ? ` — ${formatCellValue(row[roleColumn.column_name])}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Evidence ({caseEvidence.length})</h3>
          {caseEvidence.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No evidence logged.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {caseEvidence.map((row) => (
                <li key={row.ROWID}>
                  <p className="font-medium text-foreground">
                    {evidenceTitleColumn ? String(row[evidenceTitleColumn.column_name] ?? '') : row.ROWID}
                    {evidenceTypeColumn && row[evidenceTypeColumn.column_name] ? (
                      <span className="ml-2 text-xs font-normal uppercase tracking-wide text-muted-foreground">{formatCellValue(row[evidenceTypeColumn.column_name])}</span>
                    ) : null}
                  </p>
                  {evidenceSummaryColumn && row[evidenceSummaryColumn.column_name] ? (
                    <p className="text-xs text-muted-foreground">{formatCellValue(row[evidenceSummaryColumn.column_name])}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Key findings ({keyFindings.length})</h3>
          {keyFindings.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No notebook entries flagged as key findings yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {keyFindings.map((row) => (
                <li key={row.ROWID}>
                  <p className="font-medium text-foreground">{notebookTitleColumn ? String(row[notebookTitleColumn.column_name] ?? '') : row.ROWID}</p>
                  {notebookContentColumn && <p className="text-xs text-muted-foreground">{formatCellValue(row[notebookContentColumn.column_name])}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Hypotheses ({caseHypotheses.length})</h3>
          {caseHypotheses.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No hypotheses recorded.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {caseHypotheses.map((row) => {
                const statementColumn = findColumnByPattern(hypotheses.columns, [/^statement$/i]);
                const confidenceColumn = findColumnByPattern(hypotheses.columns, [/^confidence$/i]);
                return (
                  <li key={row.ROWID} className="text-foreground">
                    {statementColumn ? String(row[statementColumn.column_name] ?? '') : row.ROWID}
                    {confidenceColumn && row[confidenceColumn.column_name] ? (
                      <span className="ml-2 text-xs text-muted-foreground">({formatCellValue(row[confidenceColumn.column_name])} confidence)</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-foreground">Chronology ({timeline.length} events)</h3>
          {timeline.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No recorded activity.</p>
          ) : (
            <ol className="mt-2 space-y-2 border-l border-border pl-4 text-sm">
              {timeline.map((event) => (
                <li key={event.id}>
                  <p className="text-xs text-muted-foreground">{formatCellValue(event.occurredAt)}</p>
                  <p className="text-foreground">{event.title}</p>
                  {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </ReportDocument>
    </div>
  );
}
