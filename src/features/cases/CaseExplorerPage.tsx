import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, FolderOpen } from 'lucide-react';
import { useCases, useCaseSchema } from '../../hooks/useCases';
import { buttonVariants } from '../../shared/components/ui/button';
import { Badge } from '../../shared/components/ui/badge';
import { Input } from '../../shared/components/ui/input';
import { Skeleton } from '../../shared/components/ui/skeleton';
import { FilterChip } from '../../shared/components/ui/filter-chip';
import { CASES_DEMO, synthesizeRowsFromSchema } from '../../shared/lib/demoData';
import { env } from '../../utils/env';
import {
  SYSTEM_COLUMN_NAMES,
  STATUS_COLUMN_PATTERNS,
  PRIORITY_COLUMN_PATTERNS,
  toFieldLabel,
  formatCellValue,
  findColumnByPattern,
  statusTone,
  priorityTone,
  cn,
} from '../../shared/lib/utils';
import type { CaseRecord } from '../../types/case.types';

const MAX_LIST_COLUMNS = 6;

export function CaseExplorerPage() {
  const { data: schema, isPending: isSchemaPending, isError: isSchemaError } = useCaseSchema();
  const { data, isPending, isError } = useCases();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  // schema/data.content are typed as arrays, but an unauthenticated/failed
  // request can resolve successfully with malformed content instead of
  // rejecting, so this re-validates at runtime rather than trusting the type.
  const safeSchema = Array.isArray(schema) ? schema : undefined;
  const fallbackEnabled = env.features.enableSampleDataFallback;
  const tableMissing = (isSchemaError || (schema !== undefined && !safeSchema)) && fallbackEnabled;
  const effectiveSchema = safeSchema ?? (tableMissing ? CASES_DEMO.schema : undefined);

  const realRows = Array.isArray(data?.content) ? data.content : [];
  const tableEmpty = Boolean(safeSchema) && !isPending && realRows.length === 0 && fallbackEnabled;

  let rows: CaseRecord[] = realRows;
  let isDemo = false;
  if (tableMissing) {
    rows = CASES_DEMO.rows as CaseRecord[];
    isDemo = true;
  } else if (tableEmpty) {
    rows = synthesizeRowsFromSchema<CaseRecord>(safeSchema!, 6);
    isDemo = true;
  }

  const displayColumns = (effectiveSchema ?? [])
    .filter((c) => !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()))
    .sort((a, b) => Number(a.column_sequence ?? 0) - Number(b.column_sequence ?? 0))
    .slice(0, MAX_LIST_COLUMNS);

  const statusColumn = effectiveSchema ? findColumnByPattern(effectiveSchema, STATUS_COLUMN_PATTERNS) : undefined;
  const priorityColumn = effectiveSchema ? findColumnByPattern(effectiveSchema, PRIORITY_COLUMN_PATTERNS) : undefined;

  const statusOptions = useMemo(() => {
    if (!statusColumn) return [];
    return Array.from(new Set(rows.map((r) => String(r[statusColumn.column_name] ?? '')).filter(Boolean)));
  }, [rows, statusColumn]);

  const priorityOptions = useMemo(() => {
    if (!priorityColumn) return [];
    return Array.from(new Set(rows.map((r) => String(r[priorityColumn.column_name] ?? '')).filter(Boolean)));
  }, [rows, priorityColumn]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter && statusColumn && String(row[statusColumn.column_name] ?? '') !== statusFilter) return false;
      if (priorityFilter && priorityColumn && String(row[priorityColumn.column_name] ?? '') !== priorityFilter) {
        return false;
      }
      if (!query) return true;
      return displayColumns.some((column) => String(row[column.column_name] ?? '').toLowerCase().includes(query));
    });
  }, [rows, search, statusFilter, priorityFilter, statusColumn, priorityColumn, displayColumns]);

  const isLoading = isPending || isSchemaPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Cases</h1>
            <p className="text-sm text-muted-foreground">Every case you have access to, in one place.</p>
          </div>
          {isDemo && <Badge variant="warning">Sample data</Badge>}
        </div>
        <Link to="/cases/new" className={cn(buttonVariants({ variant: 'primary' }))}>
          New case
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases…"
            className="pl-9"
            aria-label="Search cases"
          />
        </div>

        {statusOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</span>
            {statusOptions.map((option) => (
              <FilterChip
                key={option}
                label={option}
                active={statusFilter === option}
                onClick={() => setStatusFilter((prev) => (prev === option ? null : option))}
              />
            ))}
          </div>
        )}

        {priorityOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</span>
            {priorityOptions.map((option) => (
              <FilterChip
                key={option}
                label={option}
                active={priorityFilter === option}
                onClick={() => setPriorityFilter((prev) => (prev === option ? null : option))}
              />
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!isLoading && isError && !tableMissing && (
        <p className="text-sm text-critical">Could not load cases. Check your connection and try again.</p>
      )}

      {!isLoading && filteredRows.length === 0 && rows.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No cases match your search or filters.</p>
        </div>
      )}

      {!isLoading && rows.length === 0 && !isError && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">No cases yet</p>
            <p className="text-sm text-muted-foreground">Register the first case to start an investigation.</p>
          </div>
          <Link to="/cases/new" className={cn(buttonVariants({ variant: 'primary' }), 'mt-2')}>
            New case
          </Link>
        </div>
      )}

      {!isLoading && filteredRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                {displayColumns.map((column) => (
                  <th key={column.column_id} className="whitespace-nowrap px-4 py-3 font-medium">
                    {toFieldLabel(column.column_name)}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.ROWID} className="border-b border-border last:border-0 hover:bg-muted">
                  {displayColumns.map((column) => {
                    const value = row[column.column_name];
                    const isStatus = statusColumn?.column_id === column.column_id;
                    const isPriority = priorityColumn?.column_id === column.column_id;
                    return (
                      <td key={column.column_id} className="whitespace-nowrap px-4 py-3">
                        {isStatus ? (
                          <Badge variant={statusTone(value)}>{formatCellValue(value)}</Badge>
                        ) : isPriority ? (
                          <Badge variant={priorityTone(value)}>{formatCellValue(value)}</Badge>
                        ) : (
                          formatCellValue(value)
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                    <Link to={`/cases/${row.ROWID}`} className="font-medium text-primary hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filteredRows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredRows.length} of {rows.length} case{rows.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
