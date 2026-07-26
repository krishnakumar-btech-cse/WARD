import { useState } from 'react';
import { Sparkles, Bookmark, Star, RefreshCw, Trash2, Link2 } from 'lucide-react';
import type { CatalystColumnMeta } from '../../../../types/catalyst-sdk';
import type { CatalystRow } from '../../../../types/catalyst.types';
import { Sheet } from '../../../../shared/components/ui/sheet';
import { Badge } from '../../../../shared/components/ui/badge';
import { Button } from '../../../../shared/components/ui/button';
import { NotebookAttachmentViewer } from './NotebookAttachmentViewer';
import { useUpdateNotebookEntry, useDeleteNotebookEntry, useUploadNotebookFile } from '../../../../hooks/useNotebookEntries';
import { useEvidenceList, useEvidenceSchema } from '../../../../hooks/useEvidence';
import { useWorkspaceItems, useWorkspaceItemSchema } from '../../../../hooks/useWorkspaceItems';
import { useInvokeAI } from '../../../../hooks/useAI';
import { resolveTableDisplay, EVIDENCE_DEMO, WORKSPACE_ITEMS_DEMO } from '../../../../shared/lib/demoData';
import { env } from '../../../../utils/env';
import {
  SYSTEM_COLUMN_NAMES,
  LABEL_COLUMN_PATTERNS,
  ITEM_TYPE_COLUMN_PATTERNS,
  EVIDENCE_TITLE_COLUMN_PATTERNS,
  FILE_KEY_COLUMN_PATTERNS,
  ENTRY_TYPE_COLUMN_PATTERNS,
  CONTENT_COLUMN_PATTERNS,
  OCR_TEXT_COLUMN_PATTERNS,
  AI_SUMMARY_COLUMN_PATTERNS,
  BOOKMARK_COLUMN_PATTERNS,
  KEY_FINDING_COLUMN_PATTERNS,
  EVIDENCE_ID_COLUMN_PATTERNS,
  PERSON_ID_COLUMN_PATTERNS,
  CASE_ID_COLUMN_PATTERNS,
  findColumnByPattern,
  toFieldLabel,
  formatCellValue,
  cn,
} from '../../../../shared/lib/utils';

interface NotebookEntryDrawerProps {
  open: boolean;
  onClose: () => void;
  row: CatalystRow;
  schema: CatalystColumnMeta[];
  isDemo: boolean;
  caseId: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function NotebookEntryDrawer({ open, onClose, row, schema, isDemo, caseId }: NotebookEntryDrawerProps) {
  const [replacingFile, setReplacingFile] = useState(false);

  const titleColumn = findColumnByPattern(schema, LABEL_COLUMN_PATTERNS);
  const entryTypeColumn = findColumnByPattern(schema, ENTRY_TYPE_COLUMN_PATTERNS);
  const contentColumn = findColumnByPattern(schema, CONTENT_COLUMN_PATTERNS);
  const fileKeyColumn = findColumnByPattern(schema, FILE_KEY_COLUMN_PATTERNS);
  const ocrColumn = findColumnByPattern(schema, OCR_TEXT_COLUMN_PATTERNS);
  const aiSummaryColumn = findColumnByPattern(schema, AI_SUMMARY_COLUMN_PATTERNS);
  const bookmarkColumn = findColumnByPattern(schema, BOOKMARK_COLUMN_PATTERNS);
  const keyFindingColumn = findColumnByPattern(schema, KEY_FINDING_COLUMN_PATTERNS);
  const evidenceLinkColumn = findColumnByPattern(schema, EVIDENCE_ID_COLUMN_PATTERNS);
  const personLinkColumn = findColumnByPattern(schema, PERSON_ID_COLUMN_PATTERNS);

  const title = titleColumn ? String(row[titleColumn.column_name] ?? '') : `Entry ${row.ROWID}`;
  const entryType = entryTypeColumn ? String(row[entryTypeColumn.column_name] ?? '') : '';
  const content = contentColumn ? String(row[contentColumn.column_name] ?? '') : '';
  const fileKey = fileKeyColumn ? String(row[fileKeyColumn.column_name] ?? '') || undefined : undefined;
  const ocrText = ocrColumn ? String(row[ocrColumn.column_name] ?? '') : '';
  const aiSummary = aiSummaryColumn ? String(row[aiSummaryColumn.column_name] ?? '') : '';
  const isBookmarked = bookmarkColumn ? Boolean(row[bookmarkColumn.column_name]) : false;
  const isKeyFinding = keyFindingColumn ? Boolean(row[keyFindingColumn.column_name]) : false;
  const linkedEvidenceId = evidenceLinkColumn ? String(row[evidenceLinkColumn.column_name] ?? '') : '';
  const linkedPersonId = personLinkColumn ? String(row[personLinkColumn.column_name] ?? '') : '';

  const metadataColumns = schema
    .filter((c) => !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()))
    .filter(
      (c) =>
        ![
          titleColumn,
          entryTypeColumn,
          contentColumn,
          fileKeyColumn,
          ocrColumn,
          aiSummaryColumn,
          bookmarkColumn,
          keyFindingColumn,
          evidenceLinkColumn,
          personLinkColumn,
        ].some((x) => x?.column_id === c.column_id)
    )
    .sort((a, b) => Number(a.column_sequence ?? 0) - Number(b.column_sequence ?? 0));

  const { mutate: updateEntry, isPending: isUpdating } = useUpdateNotebookEntry();
  const { mutate: deleteEntry, isPending: isDeleting } = useDeleteNotebookEntry();
  const { mutateAsync: uploadFile, isPending: isUploadingFile } = useUploadNotebookFile();
  const { mutate: invokeAI, isPending: isSummarizing, error: summaryError } = useInvokeAI();

  const fallbackEnabled = env.features.enableSampleDataFallback;

  const evidenceListQuery = useEvidenceList();
  const evidenceSchemaQuery = useEvidenceSchema();
  const evidenceResolved = resolveTableDisplay({
    schema: evidenceSchemaQuery.data,
    schemaIsError: evidenceSchemaQuery.isError,
    realRows: evidenceListQuery.data?.content ?? [],
    listSettled: !evidenceListQuery.isPending,
    demoDataset: EVIDENCE_DEMO,
    fallbackEnabled,
  });
  const evidenceCaseColumn = findColumnByPattern(evidenceResolved.columns, CASE_ID_COLUMN_PATTERNS);
  const evidenceTitleColumn = findColumnByPattern(evidenceResolved.columns, EVIDENCE_TITLE_COLUMN_PATTERNS);
  const caseEvidence = evidenceResolved.isDemo
    ? evidenceResolved.rows
    : evidenceResolved.rows.filter((r) =>
        evidenceCaseColumn ? String(r[evidenceCaseColumn.column_name] ?? '') === caseId : true
      );

  const itemsListQuery = useWorkspaceItems();
  const itemsSchemaQuery = useWorkspaceItemSchema();
  const itemsResolved = resolveTableDisplay({
    schema: itemsSchemaQuery.data,
    schemaIsError: itemsSchemaQuery.isError,
    realRows: itemsListQuery.data?.content ?? [],
    listSettled: !itemsListQuery.isPending,
    demoDataset: WORKSPACE_ITEMS_DEMO,
    fallbackEnabled,
  });
  const itemsCaseColumn = findColumnByPattern(itemsResolved.columns, CASE_ID_COLUMN_PATTERNS);
  const itemsLabelColumn = findColumnByPattern(itemsResolved.columns, LABEL_COLUMN_PATTERNS);
  const itemsTypeColumn = findColumnByPattern(itemsResolved.columns, ITEM_TYPE_COLUMN_PATTERNS);
  const casePersons = (
    itemsResolved.isDemo
      ? itemsResolved.rows
      : itemsResolved.rows.filter((r) => (itemsCaseColumn ? String(r[itemsCaseColumn.column_name] ?? '') === caseId : true))
  ).filter((r) => {
    if (!itemsTypeColumn) return true;
    const kind = String(r[itemsTypeColumn.column_name] ?? '').toLowerCase();
    return kind === 'suspect' || kind === 'victim' || kind === 'witness';
  });

  const linkedEvidenceRow = caseEvidence.find((r) => r.ROWID === linkedEvidenceId);
  const linkedPersonRow = casePersons.find((r) => r.ROWID === linkedPersonId);
  const linkedEvidenceTitle = linkedEvidenceRow
    ? evidenceTitleColumn
      ? String(linkedEvidenceRow[evidenceTitleColumn.column_name] ?? '')
      : linkedEvidenceRow.ROWID
    : null;
  const linkedPersonName = linkedPersonRow
    ? itemsLabelColumn
      ? String(linkedPersonRow[itemsLabelColumn.column_name] ?? '')
      : linkedPersonRow.ROWID
    : null;

  function toggleBookmark() {
    if (!bookmarkColumn || isDemo) return;
    updateEntry({ ROWID: row.ROWID, [bookmarkColumn.column_name]: !isBookmarked });
  }

  function toggleKeyFinding() {
    if (!keyFindingColumn || isDemo) return;
    updateEntry({ ROWID: row.ROWID, [keyFindingColumn.column_name]: !isKeyFinding });
  }

  function handleLinkEvidence(evidenceId: string) {
    if (!evidenceLinkColumn) return;
    updateEntry({ ROWID: row.ROWID, [evidenceLinkColumn.column_name]: evidenceId });
  }

  function handleLinkPerson(personId: string) {
    if (!personLinkColumn) return;
    updateEntry({ ROWID: row.ROWID, [personLinkColumn.column_name]: personId });
  }

  async function handleReplaceFile(file: File) {
    if (!fileKeyColumn) return;
    const objectKey = `case/${caseId}/notebook/${row.ROWID}/${Date.now()}-${file.name}`;
    await uploadFile({ key: objectKey, file });
    updateEntry({ ROWID: row.ROWID, [fileKeyColumn.column_name]: objectKey });
    setReplacingFile(false);
  }

  function handleDelete() {
    if (!window.confirm('Delete this notebook entry? This cannot be undone.')) return;
    deleteEntry(row.ROWID, { onSuccess: onClose });
  }

  function handleGenerateSummary() {
    if (!aiSummaryColumn) return;
    invokeAI({ payload: { action: 'summarize-notebook-entry', entryId: row.ROWID, content } });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={
        <span className="flex items-center gap-2">
          {entryType && <Badge variant="neutral">{entryType}</Badge>}
          {isKeyFinding && <Badge variant="primary">Key finding</Badge>}
          {isDemo && <Badge variant="warning">Sample data</Badge>}
        </span>
      }
      actions={
        bookmarkColumn && (
          <button
            type="button"
            onClick={toggleBookmark}
            disabled={isDemo || isUpdating}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this entry'}
            className={cn(
              'rounded-md p-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
              isBookmarked ? 'text-warning' : 'text-muted-foreground'
            )}
          >
            <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        )
      }
    >
      <div className="space-y-6">
        {content && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{content}</p>}

        <NotebookAttachmentViewer fileKey={fileKey} title={title} isDemo={isDemo} />

        {!isDemo && fileKeyColumn && (
          <div className="flex items-center gap-2">
            {!replacingFile ? (
              <Button variant="outline" size="sm" onClick={() => setReplacingFile(true)}>
                <RefreshCw className="h-4 w-4" />
                {fileKey ? 'Replace attachment' : 'Attach a file'}
              </Button>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleReplaceFile(file);
                  }}
                />
                <span className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-border">
                  {isUploadingFile || isUpdating ? 'Uploading…' : 'Choose file…'}
                </span>
                <button type="button" onClick={() => setReplacingFile(false)} className="text-xs hover:underline">
                  Cancel
                </button>
              </label>
            )}
          </div>
        )}

        {keyFindingColumn && (
          <Button
            variant={isKeyFinding ? 'secondary' : 'outline'}
            size="sm"
            onClick={toggleKeyFinding}
            disabled={isDemo || isUpdating}
          >
            <Star className="h-4 w-4" fill={isKeyFinding ? 'currentColor' : 'none'} />
            {isKeyFinding ? 'Marked as key finding' : 'Mark as key finding'}
          </Button>
        )}

        {metadataColumns.length > 0 && (
          <Section title="Metadata">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {metadataColumns.map((column) => (
                <div key={column.column_id}>
                  <dt className="text-xs text-muted-foreground">{toFieldLabel(column.column_name)}</dt>
                  <dd className="text-sm text-foreground">{formatCellValue(row[column.column_name])}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {ocrColumn && (
          <Section title="OCR results">
            {ocrText ? (
              <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">{ocrText}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No text extracted yet.</p>
            )}
          </Section>
        )}

        {aiSummaryColumn && (
          <Section title="AI summary">
            {aiSummary ? (
              <p className="whitespace-pre-wrap rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                {aiSummary}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Not summarized yet.</p>
                <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isSummarizing || isDemo}>
                  <Sparkles className="h-4 w-4" />
                  {isSummarizing ? 'Generating…' : 'Generate AI summary'}
                </Button>
                {summaryError && (
                  <p className="text-xs text-critical">
                    {summaryError instanceof Error ? summaryError.message : 'AI Analyst is not connected yet.'}
                  </p>
                )}
              </div>
            )}
          </Section>
        )}

        {(evidenceLinkColumn || personLinkColumn) && (
          <Section title="Linked to this entry">
            <div className="space-y-3">
              {evidenceLinkColumn && (
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <select
                    aria-label="Linked evidence"
                    value={linkedEvidenceId}
                    disabled={isDemo || isUpdating}
                    onChange={(e) => handleLinkEvidence(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">No linked evidence</option>
                    {caseEvidence.map((r) => (
                      <option key={r.ROWID} value={r.ROWID}>
                        {evidenceTitleColumn ? String(r[evidenceTitleColumn.column_name] ?? r.ROWID) : r.ROWID}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!evidenceLinkColumn && linkedEvidenceTitle && <p className="text-sm text-foreground">Evidence: {linkedEvidenceTitle}</p>}

              {personLinkColumn && (
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <select
                    aria-label="Linked person"
                    value={linkedPersonId}
                    disabled={isDemo || isUpdating}
                    onChange={(e) => handleLinkPerson(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">No linked person</option>
                    {casePersons.map((r) => (
                      <option key={r.ROWID} value={r.ROWID}>
                        {itemsLabelColumn ? String(r[itemsLabelColumn.column_name] ?? r.ROWID) : r.ROWID}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {linkedEvidenceTitle && evidenceLinkColumn && (
                <p className="text-xs text-muted-foreground">Currently linked to “{linkedEvidenceTitle}”.</p>
              )}
              {linkedPersonName && personLinkColumn && (
                <p className="text-xs text-muted-foreground">Currently linked to “{linkedPersonName}”.</p>
              )}
            </div>
          </Section>
        )}

        <Section title="Actions">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDemo || isDeleting}>
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting…' : 'Delete entry'}
          </Button>
        </Section>
      </div>
    </Sheet>
  );
}
