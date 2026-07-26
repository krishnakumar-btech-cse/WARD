import { useState } from 'react';
import { Sparkles, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { CatalystColumnMeta } from '../../../../types/catalyst-sdk';
import type { CatalystRow } from '../../../../types/catalyst.types';
import { Sheet } from '../../../../shared/components/ui/sheet';
import { Badge } from '../../../../shared/components/ui/badge';
import { Button } from '../../../../shared/components/ui/button';
import { EvidenceViewer } from './EvidenceViewer';
import {
  useUpdateEvidenceRecord,
  useDeleteEvidenceRecord,
  useUploadEvidenceFile,
} from '../../../../hooks/useEvidence';
import { useWorkspaceItemSchema, useCreateWorkspaceItem } from '../../../../hooks/useWorkspaceItems';
import { useInvokeAI } from '../../../../hooks/useAI';
import {
  SYSTEM_COLUMN_NAMES,
  EVIDENCE_TITLE_COLUMN_PATTERNS,
  FILE_KEY_COLUMN_PATTERNS,
  FILE_TYPE_COLUMN_PATTERNS,
  OCR_TEXT_COLUMN_PATTERNS,
  TRANSCRIPT_COLUMN_PATTERNS,
  AI_SUMMARY_COLUMN_PATTERNS,
  CASE_ID_COLUMN_PATTERNS,
  findColumnByPattern,
  toFieldLabel,
  formatCellValue,
} from '../../../../shared/lib/utils';
import { inferMediaKind } from '../../../../shared/lib/media';

interface EvidenceDetailDrawerProps {
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

export function EvidenceDetailDrawer({ open, onClose, row, schema, isDemo, caseId }: EvidenceDetailDrawerProps) {
  const [replacingFile, setReplacingFile] = useState(false);

  const titleColumn = findColumnByPattern(schema, EVIDENCE_TITLE_COLUMN_PATTERNS);
  const fileKeyColumn = findColumnByPattern(schema, FILE_KEY_COLUMN_PATTERNS);
  const fileTypeColumn = findColumnByPattern(schema, FILE_TYPE_COLUMN_PATTERNS);
  const ocrColumn = findColumnByPattern(schema, OCR_TEXT_COLUMN_PATTERNS);
  const transcriptColumn = findColumnByPattern(schema, TRANSCRIPT_COLUMN_PATTERNS);
  const aiSummaryColumn = findColumnByPattern(schema, AI_SUMMARY_COLUMN_PATTERNS);

  const title = titleColumn ? String(row[titleColumn.column_name] ?? '') : `Evidence ${row.ROWID}`;
  const fileKey = fileKeyColumn ? String(row[fileKeyColumn.column_name] ?? '') || undefined : undefined;
  const fileType = fileTypeColumn ? String(row[fileTypeColumn.column_name] ?? '') : inferMediaKind(fileKey);
  const ocrText = ocrColumn ? String(row[ocrColumn.column_name] ?? '') : '';
  const transcript = transcriptColumn ? String(row[transcriptColumn.column_name] ?? '') : '';
  const aiSummary = aiSummaryColumn ? String(row[aiSummaryColumn.column_name] ?? '') : '';

  const metadataColumns = schema
    .filter((c) => !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()))
    .filter((c) => ![titleColumn, fileKeyColumn, ocrColumn, transcriptColumn, aiSummaryColumn].some((x) => x?.column_id === c.column_id))
    .sort((a, b) => Number(a.column_sequence ?? 0) - Number(b.column_sequence ?? 0));

  const { mutate: updateRecord, isPending: isUpdating } = useUpdateEvidenceRecord();
  const { mutate: deleteRecord, isPending: isDeleting } = useDeleteEvidenceRecord();
  const { mutateAsync: uploadFile, isPending: isUploadingFile } = useUploadEvidenceFile();
  const { data: workspaceItemSchema } = useWorkspaceItemSchema();
  const { mutate: createWorkspaceItem, isPending: isAddingToBoard, isSuccess: addedToBoard } = useCreateWorkspaceItem();
  const { mutate: invokeAI, isPending: isSummarizing, error: summaryError } = useInvokeAI();

  async function handleReplaceFile(file: File) {
    if (!fileKeyColumn) return;
    const objectKey = `case/${caseId}/evidence/${row.ROWID}/${Date.now()}-${file.name}`;
    await uploadFile({ key: objectKey, file });
    updateRecord({ ROWID: row.ROWID, [fileKeyColumn.column_name]: objectKey });
    setReplacingFile(false);
  }

  function handleAddToBoard() {
    // workspaceItemSchema is typed as an array, but an unauthenticated/
    // failed request can resolve successfully with malformed content
    // instead of rejecting, so this re-validates at runtime.
    if (!Array.isArray(workspaceItemSchema)) return;
    const itemTypeColumn = findColumnByPattern(workspaceItemSchema, [/^item.?type$/i, /^type$/i, /^category$/i]);
    const labelColumn = findColumnByPattern(workspaceItemSchema, [/^label$/i, /^name$/i, /^title$/i]);
    const boardCaseColumn = findColumnByPattern(workspaceItemSchema, CASE_ID_COLUMN_PATTERNS);

    const payload: Record<string, unknown> = {};
    if (itemTypeColumn) payload[itemTypeColumn.column_name] = 'Evidence';
    if (labelColumn) payload[labelColumn.column_name] = title;
    if (boardCaseColumn) payload[boardCaseColumn.column_name] = caseId;
    createWorkspaceItem(payload);
  }

  function handleDelete() {
    if (!window.confirm('Remove this evidence record? This cannot be undone.')) return;
    deleteRecord(row.ROWID, { onSuccess: onClose });
  }

  function handleGenerateSummary() {
    if (!aiSummaryColumn) return;
    invokeAI({ payload: { action: 'summarize-evidence', evidenceId: row.ROWID, fileKey } });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={
        <span className="flex items-center gap-2">
          <Badge variant="neutral">{fileType || 'Unknown type'}</Badge>
          {isDemo && <Badge variant="warning">Sample data</Badge>}
        </span>
      }
    >
      <div className="space-y-6">
        <EvidenceViewer fileKey={fileKey} title={title} isDemo={isDemo} />

        {!isDemo && fileKeyColumn && (
          <div className="flex items-center gap-2">
            {!replacingFile ? (
              <Button variant="outline" size="sm" onClick={() => setReplacingFile(true)}>
                <RefreshCw className="h-4 w-4" />
                Replace file
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
                  {isUploadingFile || isUpdating ? 'Uploading…' : 'Choose new file…'}
                </span>
                <button type="button" onClick={() => setReplacingFile(false)} className="text-xs hover:underline">
                  Cancel
                </button>
              </label>
            )}
          </div>
        )}

        <Section title="Metadata">
          {metadataColumns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No additional metadata.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {metadataColumns.map((column) => (
                <div key={column.column_id}>
                  <dt className="text-xs text-muted-foreground">{toFieldLabel(column.column_name)}</dt>
                  <dd className="text-sm text-foreground">{formatCellValue(row[column.column_name])}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        {ocrColumn && (
          <Section title="OCR results">
            {ocrText ? (
              <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">{ocrText}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No text extracted yet.</p>
            )}
          </Section>
        )}

        {transcriptColumn && (
          <Section title="Speech-to-text transcript">
            {transcript ? (
              <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">{transcript}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No transcript available yet.</p>
            )}
          </Section>
        )}

        {aiSummaryColumn && (
          <Section title="AI evidence summary">
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

        <Section title="Chain of custody">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between gap-4">
              <span className="text-muted-foreground">Uploaded</span>
              <span className="text-foreground">{formatCellValue(row.CREATEDTIME)}</span>
            </li>
            {row.CREATORID && (
              <li className="flex justify-between gap-4">
                <span className="text-muted-foreground">Uploaded by</span>
                <span className="text-foreground">{formatCellValue(row.CREATORID)}</span>
              </li>
            )}
            <li className="flex justify-between gap-4">
              <span className="text-muted-foreground">Last modified</span>
              <span className="text-foreground">{formatCellValue(row.MODIFIEDTIME)}</span>
            </li>
          </ul>
        </Section>

        <Section title="Actions">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToBoard}
              disabled={isDemo || isAddingToBoard || addedToBoard || !workspaceItemSchema}
            >
              <Plus className="h-4 w-4" />
              {addedToBoard ? 'Added to board' : isAddingToBoard ? 'Adding…' : 'Add to Investigation Board'}
            </Button>
            {!workspaceItemSchema && !isDemo && (
              <p className="basis-full text-xs text-muted-foreground">
                Create the WorkspaceItems table to link evidence onto the board.
              </p>
            )}
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDemo || isDeleting}>
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Removing…' : 'Remove evidence'}
            </Button>
          </div>
        </Section>
      </div>
    </Sheet>
  );
}
