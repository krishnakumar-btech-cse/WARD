import { useMemo, useState } from 'react';
import { Search, NotebookPen } from 'lucide-react';
import {
  useNotebookEntries,
  useNotebookEntrySchema,
  useCreateNotebookEntry,
  useUpdateNotebookEntry,
  useUploadNotebookFile,
} from '../../../hooks/useNotebookEntries';
import { DynamicForm } from '../../../shared/components/DynamicForm';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Input } from '../../../shared/components/ui/input';
import { Skeleton } from '../../../shared/components/ui/skeleton';
import { FilterChip } from '../../../shared/components/ui/filter-chip';
import { NotebookEntryCard } from './notebook/NotebookEntryCard';
import { NotebookEntryDrawer } from './notebook/NotebookEntryDrawer';
import { resolveTableDisplay, NOTEBOOK_ENTRIES_DEMO } from '../../../shared/lib/demoData';
import { env } from '../../../utils/env';
import {
  CASE_ID_COLUMN_PATTERNS,
  LABEL_COLUMN_PATTERNS,
  ENTRY_TYPE_COLUMN_PATTERNS,
  CONTENT_COLUMN_PATTERNS,
  FILE_KEY_COLUMN_PATTERNS,
  BOOKMARK_COLUMN_PATTERNS,
  KEY_FINDING_COLUMN_PATTERNS,
  findColumnByPattern,
} from '../../../shared/lib/utils';
import type { NotebookEntryRecord } from '../../../types/notebook.types';

/**
 * The Investigation Intelligence Notebook for one case: a searchable,
 * filterable running log of text/voice/image/document entries. Opening an
 * entry slides in the full detail view (attachment viewer, OCR, AI summary,
 * bookmarking, key findings, linked evidence/persons).
 */
export function NotebookTab({ caseId }: { caseId: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [keyFindingsOnly, setKeyFindingsOnly] = useState(false);
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const { data: schema, isPending: isSchemaPending, isError: isSchemaError } = useNotebookEntrySchema();
  const { data, isPending, isError } = useNotebookEntries();
  const { mutateAsync: createEntry, isPending: isSaving, error: createError } = useCreateNotebookEntry();
  const { mutateAsync: updateEntry } = useUpdateNotebookEntry();
  const { mutateAsync: uploadFile, isPending: isUploadingFile } = useUploadNotebookFile();

  const fallbackEnabled = env.features.enableSampleDataFallback;
  const {
    columns: effectiveSchema,
    rows: allRows,
    isDemo,
  } = resolveTableDisplay<NotebookEntryRecord>({
    schema,
    schemaIsError: isSchemaError,
    realRows: data?.content ?? [],
    listSettled: !isPending,
    demoDataset: NOTEBOOK_ENTRIES_DEMO,
    fallbackEnabled,
  });

  const caseColumn = findColumnByPattern(effectiveSchema, CASE_ID_COLUMN_PATTERNS);
  const titleColumn = findColumnByPattern(effectiveSchema, LABEL_COLUMN_PATTERNS);
  const entryTypeColumn = findColumnByPattern(effectiveSchema, ENTRY_TYPE_COLUMN_PATTERNS);
  const contentColumn = findColumnByPattern(effectiveSchema, CONTENT_COLUMN_PATTERNS);
  const fileKeyColumn = findColumnByPattern(effectiveSchema, FILE_KEY_COLUMN_PATTERNS);
  const bookmarkColumn = findColumnByPattern(effectiveSchema, BOOKMARK_COLUMN_PATTERNS);
  const keyFindingColumn = findColumnByPattern(effectiveSchema, KEY_FINDING_COLUMN_PATTERNS);

  const scopedRows =
    !isDemo && caseColumn ? allRows.filter((row) => String(row[caseColumn.column_name] ?? '') === caseId) : allRows;

  const sortedRows = useMemo(
    () => [...scopedRows].sort((a, b) => String(b.CREATEDTIME ?? '').localeCompare(String(a.CREATEDTIME ?? ''))),
    [scopedRows]
  );

  const typeOptions = useMemo(() => {
    if (!entryTypeColumn) return [];
    return Array.from(new Set(sortedRows.map((r) => String(r[entryTypeColumn.column_name] ?? '')).filter(Boolean)));
  }, [sortedRows, entryTypeColumn]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedRows.filter((row) => {
      if (typeFilter && entryTypeColumn && String(row[entryTypeColumn.column_name] ?? '') !== typeFilter) return false;
      if (bookmarkedOnly && bookmarkColumn && !row[bookmarkColumn.column_name]) return false;
      if (keyFindingsOnly && keyFindingColumn && !row[keyFindingColumn.column_name]) return false;
      if (!query) return true;
      const title = titleColumn ? String(row[titleColumn.column_name] ?? '') : '';
      const content = contentColumn ? String(row[contentColumn.column_name] ?? '') : '';
      return `${title} ${content}`.toLowerCase().includes(query);
    });
  }, [sortedRows, search, typeFilter, bookmarkedOnly, keyFindingsOnly, entryTypeColumn, bookmarkColumn, keyFindingColumn, titleColumn, contentColumn]);

  const openRow = scopedRows.find((r) => r.ROWID === openRowId);
  const isLoading = isPending || isSchemaPending;

  async function handleSubmit(values: Record<string, unknown>) {
    const payload = caseColumn && !values[caseColumn.column_name] ? { ...values, [caseColumn.column_name]: caseId } : values;
    const created = await createEntry(payload);
    const row = created[0];

    if (row && selectedFile && fileKeyColumn) {
      const objectKey = `case/${caseId}/notebook/${row.ROWID}/${selectedFile.name}`;
      await uploadFile({ key: objectKey, file: selectedFile });
      await updateEntry({ ROWID: row.ROWID, [fileKeyColumn.column_name]: objectKey });
    }

    setIsCreating(false);
    setSelectedFile(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Investigation Notebook</h2>
            <p className="text-sm text-muted-foreground">Voice notes, images, documents, and findings for this case.</p>
          </div>
          {isDemo && <Badge variant="warning">Sample data</Badge>}
        </div>
        {!isCreating && (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            New entry
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          {schema ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Attach a file (optional)</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                />
              </div>
              <DynamicForm
                columns={schema}
                submitLabel={isSaving || isUploadingFile ? 'Saving…' : 'Save entry'}
                isSubmitting={isSaving || isUploadingFile}
                submitError={createError instanceof Error ? createError.message : null}
                onCancel={() => {
                  setIsCreating(false);
                  setSelectedFile(null);
                }}
                onSubmit={handleSubmit}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Create the NotebookEntries table to start writing entries.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notebook…"
            className="pl-9"
            aria-label="Search notebook entries"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {bookmarkColumn && (
            <FilterChip label="Bookmarked" active={bookmarkedOnly} onClick={() => setBookmarkedOnly((v) => !v)} />
          )}
          {keyFindingColumn && (
            <FilterChip label="Key findings" active={keyFindingsOnly} onClick={() => setKeyFindingsOnly((v) => !v)} />
          )}
          {typeOptions.map((option) => (
            <FilterChip
              key={option}
              label={option}
              active={typeFilter === option}
              onClick={() => setTypeFilter((prev) => (prev === option ? null : option))}
            />
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && isError && !isDemo && <p className="text-sm text-critical">Could not load notebook entries.</p>}

      {!isLoading && filteredRows.length === 0 && scopedRows.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No entries match your search or filters.</p>
        </div>
      )}

      {!isLoading && scopedRows.length === 0 && !isError && !isCreating && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <NotebookPen className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">No notebook entries yet</p>
            <p className="text-sm text-muted-foreground">Capture your first observation to start this case's notebook.</p>
          </div>
        </div>
      )}

      {!isLoading && filteredRows.length > 0 && (
        <div className="space-y-2">
          {filteredRows.map((row) => (
            <NotebookEntryCard
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
        <NotebookEntryDrawer
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
