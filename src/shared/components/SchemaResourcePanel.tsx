import { useState } from 'react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { CatalystColumnMeta } from '../../types/catalyst-sdk';
import type { CatalystPagedResponse, CatalystRow } from '../../types/catalyst.types';
import { DynamicForm } from './DynamicForm';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { SYSTEM_COLUMN_NAMES, toFieldLabel, formatCellValue, findColumnByPattern } from '../lib/utils';
import { resolveTableDisplay, type DemoDataset } from '../lib/demoData';
import { env } from '../../utils/env';

export interface SchemaResourcePanelHooks<T extends CatalystRow> {
  useList: (params?: { nextToken?: string; maxRows?: number }) => UseQueryResult<CatalystPagedResponse<T[]>>;
  useSchema: () => UseQueryResult<CatalystColumnMeta[]>;
  useCreate?: () => UseMutationResult<T[], Error, Record<string, unknown>>;
  useRemove?: () => UseMutationResult<T, Error, string>;
}

export interface SchemaResourcePanelProps<T extends CatalystRow> {
  title: string;
  description?: string;
  emptyMessage?: string;
  hooks: SchemaResourcePanelHooks<T>;
  /** When set, editable-column patterns matching these get auto-filled with linkValue on create (e.g. a case reference). */
  linkColumnPatterns?: RegExp[];
  linkValue?: string;
  maxColumns?: number;
  readOnly?: boolean;
  /** Hand-authored fallback shown only when the table doesn't exist yet (getColumns() itself fails). */
  demoDataset?: DemoDataset;
}

const DEFAULT_MAX_COLUMNS = 6;

/**
 * Schema-driven list + create + delete for any table-backed resource whose
 * columns aren't known ahead of time. Powers Notebook, Timeline, Hypotheses,
 * Tasks, Network entities/relationships, and read-only Crime Pattern views —
 * one implementation instead of one per module.
 *
 * Falls back to realistic sample data in two tiers, never in place of real
 * rows: if the table exists but is empty, rows are synthesized from its real
 * schema; if the table doesn't exist yet, a hand-authored demo dataset is
 * shown instead. Either way create/delete are disabled against fake rows.
 */
export function SchemaResourcePanel<T extends CatalystRow>({
  title,
  description,
  emptyMessage = 'Nothing here yet.',
  hooks,
  linkColumnPatterns,
  linkValue,
  maxColumns = DEFAULT_MAX_COLUMNS,
  readOnly = false,
  demoDataset,
}: SchemaResourcePanelProps<T>) {
  const [isCreating, setIsCreating] = useState(false);
  const { data: rawSchema, isPending: isSchemaPending, isError: isSchemaError } = hooks.useSchema();
  const { data, isPending, isError } = hooks.useList();
  const createMutation = hooks.useCreate?.();
  const removeMutation = hooks.useRemove?.();

  // rawSchema/data.content are typed as arrays, but an unauthenticated/
  // failed request can resolve successfully with malformed content instead
  // of rejecting, so this re-validates at runtime rather than trusting the type.
  const schema = Array.isArray(rawSchema) ? rawSchema : undefined;

  const fallbackEnabled = env.features.enableSampleDataFallback;
  const tableMissing = (isSchemaError || (rawSchema !== undefined && !schema)) && fallbackEnabled && Boolean(demoDataset);

  const { columns: effectiveSchema, rows: displayRows, isDemo } = resolveTableDisplay<T>({
    schema,
    schemaIsError: isSchemaError,
    realRows: Array.isArray(data?.content) ? data.content : [],
    listSettled: !isPending,
    demoDataset,
    fallbackEnabled,
  });

  const displayColumns = effectiveSchema
    .filter((c) => !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()))
    .sort((a, b) => Number(a.column_sequence ?? 0) - Number(b.column_sequence ?? 0))
    .slice(0, maxColumns);

  const canCreate = !readOnly && Boolean(createMutation) && Boolean(schema);
  const canDelete = !readOnly && Boolean(removeMutation) && !isDemo;

  // Client-side scoping: filter to the linked case when the real schema has
  // a matching column. Skipped for demo rows, which aren't tied to any real
  // case. There is no server-side filter available without a Function (or a
  // hardcoded column name), so this narrows a fetched page client-side —
  // fine at this table's expected scale, not a substitute for real
  // server-side filtering once Functions exist.
  const linkColumn = linkColumnPatterns && schema ? findColumnByPattern(schema, linkColumnPatterns) : undefined;
  const scopedRows =
    !isDemo && linkColumn && linkValue
      ? displayRows.filter((row) => String(row[linkColumn.column_name] ?? '') === linkValue)
      : displayRows;

  function handleSubmit(values: Record<string, unknown>) {
    if (!createMutation) return;
    let payload = values;
    if (linkColumnPatterns && linkValue && schema) {
      const target = findColumnByPattern(schema, linkColumnPatterns);
      if (target && !payload[target.column_name]) {
        payload = { ...payload, [target.column_name]: linkValue };
      }
    }
    createMutation.mutate(payload, { onSuccess: () => setIsCreating(false) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {isDemo && <Badge variant="warning">Sample data</Badge>}
        </div>
        {canCreate && !isCreating && (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            Add
          </Button>
        )}
      </div>

      {isCreating && schema && createMutation && (
        <div className="rounded-lg border border-border bg-card p-4">
          <DynamicForm
            columns={schema}
            submitLabel="Add"
            isSubmitting={createMutation.isPending}
            submitError={createMutation.error instanceof Error ? createMutation.error.message : null}
            onCancel={() => setIsCreating(false)}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {(isPending || isSchemaPending) && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}

      {isError && !tableMissing && <p className="text-sm text-critical">Could not load this table.</p>}

      {!isPending && !isSchemaPending && scopedRows.length === 0 && !isCreating && (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}

      {!isPending && !isSchemaPending && scopedRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                {displayColumns.map((column) => (
                  <th key={column.column_id} className="whitespace-nowrap px-4 py-3 font-medium">
                    {toFieldLabel(column.column_name)}
                  </th>
                ))}
                {canDelete && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {scopedRows.map((row) => (
                <tr key={row.ROWID} className="border-b border-border last:border-0 hover:bg-muted">
                  {displayColumns.map((column) => (
                    <td key={column.column_id} className="whitespace-nowrap px-4 py-3">
                      {formatCellValue(row[column.column_name])}
                    </td>
                  ))}
                  {canDelete && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-sm font-medium text-critical hover:underline disabled:opacity-50"
                        disabled={removeMutation?.isPending}
                        onClick={() => removeMutation?.mutate(row.ROWID)}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
