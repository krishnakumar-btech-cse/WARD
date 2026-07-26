import { useMemo, useState } from 'react';
import { Search, FolderOpen } from 'lucide-react';
import {
  useEvidenceList,
  useEvidenceSchema,
  useCreateEvidenceRecord,
  useUpdateEvidenceRecord,
  useUploadEvidenceFile,
} from '../../../hooks/useEvidence';
import { DynamicForm } from '../../../shared/components/DynamicForm';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Input } from '../../../shared/components/ui/input';
import { Skeleton } from '../../../shared/components/ui/skeleton';
import { FilterChip } from '../../../shared/components/ui/filter-chip';
import { EvidenceCard } from './evidence/EvidenceCard';
import { EvidenceDetailDrawer } from './evidence/EvidenceDetailDrawer';
import { resolveTableDisplay, EVIDENCE_DEMO } from '../../../shared/lib/demoData';
import { inferMediaKind } from '../../../shared/lib/media';
import { env } from '../../../utils/env';
import {
  CASE_ID_COLUMN_PATTERNS,
  EVIDENCE_TITLE_COLUMN_PATTERNS,
  FILE_KEY_COLUMN_PATTERNS,
  FILE_TYPE_COLUMN_PATTERNS,
  findColumnByPattern,
} from '../../../shared/lib/utils';
import type { EvidenceRecord } from '../../../types/evidence.types';

/**
 * The Evidence Library for one case: a searchable, filterable card grid.
 * Opening a card slides in the full Evidence Intelligence view (viewer,
 * OCR/transcript, AI summary, chain of custody, board linking).
 */
export function EvidenceTab({ caseId }: { caseId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const { data: schema, isPending: isSchemaPending, isError: isSchemaError } = useEvidenceSchema();
  const { data, isPending, isError } = useEvidenceList();
  const { mutateAsync: createRecord, isPending: isCreating, error: createError } = useCreateEvidenceRecord();
  const { mutateAsync: updateRecord } = useUpdateEvidenceRecord();
  const { mutateAsync: uploadFile, isPending: isUploadingFile } = useUploadEvidenceFile();

  const fallbackEnabled = env.features.enableSampleDataFallback;
  const {
    columns: effectiveSchema,
    rows: allRows,
    isDemo,
  } = resolveTableDisplay<EvidenceRecord>({
    schema,
    schemaIsError: isSchemaError,
    realRows: data?.content ?? [],
    listSettled: !isPending,
    demoDataset: EVIDENCE_DEMO,
    fallbackEnabled,
  });

  const caseColumn = findColumnByPattern(effectiveSchema, CASE_ID_COLUMN_PATTERNS);
  const titleColumn = findColumnByPattern(effectiveSchema, EVIDENCE_TITLE_COLUMN_PATTERNS);
  const fileKeyColumn = findColumnByPattern(effectiveSchema, FILE_KEY_COLUMN_PATTERNS);
  const fileTypeColumn = findColumnByPattern(effectiveSchema, FILE_TYPE_COLUMN_PATTERNS);

  const scopedRows =
    !isDemo && caseColumn ? allRows.filter((row) => String(row[caseColumn.column_name] ?? '') === caseId) : allRows;

  function rowFileType(row: EvidenceRecord): string {
    if (fileTypeColumn) return String(row[fileTypeColumn.column_name] ?? '');
    return inferMediaKind(fileKeyColumn ? String(row[fileKeyColumn.column_name] ?? '') : undefined);
  }

  const typeOptions = useMemo(
    () => Array.from(new Set(scopedRows.map(rowFileType).filter(Boolean))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopedRows, fileTypeColumn, fileKeyColumn]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedRows.filter((row) => {
      if (typeFilter && rowFileType(row) !== typeFilter) return false;
      if (!query) return true;
      const title = titleColumn ? String(row[titleColumn.column_name] ?? '') : '';
      return title.toLowerCase().includes(query);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedRows, search, typeFilter, titleColumn]);

  const openRow = scopedRows.find((r) => r.ROWID === openRowId);
  const isLoading = isPending || isSchemaPending;

  async function handleSubmit(values: Record<string, unknown>) {
    const payload =
      caseColumn && !values[caseColumn.column_name] ? { ...values, [caseColumn.column_name]: caseId } : values;
    const created = await createRecord(payload);
    const row = created[0];

    if (row && selectedFile && fileKeyColumn) {
      const objectKey = `case/${caseId}/evidence/${row.ROWID}/${selectedFile.name}`;
      await uploadFile({ key: objectKey, file: selectedFile });
      await updateRecord({ ROWID: row.ROWID, [fileKeyColumn.column_name]: objectKey });
    }

    setIsUploading(false);
    setSelectedFile(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Evidence Library</h2>
            <p className="text-sm text-muted-foreground">Files and metadata collected for this case.</p>
          </div>
          {isDemo && <Badge variant="warning">Sample data</Badge>}
        </div>
        {!isUploading && (
          <Button size="sm" onClick={() => setIsUploading(true)}>
            Upload evidence
          </Button>
        )}
      </div>

      {isUploading && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          {schema ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">File</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                />
              </div>
              <DynamicForm
                columns={schema}
                submitLabel={isCreating || isUploadingFile ? 'Uploading…' : 'Save evidence'}
                isSubmitting={isCreating || isUploadingFile}
                submitError={createError instanceof Error ? createError.message : null}
                onCancel={() => {
                  setIsUploading(false);
                  setSelectedFile(null);
                }}
                onSubmit={handleSubmit}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Create the Evidence table to upload evidence.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search evidence…"
            className="pl-9"
            aria-label="Search evidence"
          />
        </div>
        {typeOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</span>
            {typeOptions.map((option) => (
              <FilterChip
                key={option}
                label={option}
                active={typeFilter === option}
                onClick={() => setTypeFilter((prev) => (prev === option ? null : option))}
              />
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && isError && !isDemo && (
        <p className="text-sm text-critical">Could not load evidence for this case.</p>
      )}

      {!isLoading && filteredRows.length === 0 && scopedRows.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No evidence matches your search or filters.</p>
        </div>
      )}

      {!isLoading && scopedRows.length === 0 && !isError && !isUploading && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">No evidence yet</p>
            <p className="text-sm text-muted-foreground">Upload the first file to start building this case's evidence library.</p>
          </div>
        </div>
      )}

      {!isLoading && filteredRows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredRows.map((row) => (
            <EvidenceCard
              key={row.ROWID}
              row={row}
              schema={effectiveSchema}
              isDemo={isDemo}
              onOpen={() => setOpenRowId(row.ROWID)}
            />
          ))}
        </div>
      )}

      {openRow && (
        <EvidenceDetailDrawer
          open
          onClose={() => setOpenRowId(null)}
          row={openRow}
          schema={effectiveSchema}
          isDemo={isDemo}
          caseId={caseId}
        />
      )}
    </div>
  );
}
