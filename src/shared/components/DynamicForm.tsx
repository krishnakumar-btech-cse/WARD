import { useMemo, useState, type FormEvent } from 'react';
import type { CatalystColumnMeta } from '../../types/catalyst-sdk';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { SYSTEM_COLUMN_NAMES, toFieldLabel } from '../lib/utils';

type FieldKind = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'checkbox';

function inferFieldKind(column: CatalystColumnMeta): FieldKind {
  const type = column.data_type.toLowerCase();
  if (type.includes('bool')) return 'checkbox';
  if (type.includes('datetime') || type.includes('timestamp')) return 'datetime';
  if (type.includes('date')) return 'date';
  if (
    type.includes('int') ||
    type.includes('decimal') ||
    type.includes('double') ||
    type.includes('float') ||
    type.includes('number')
  ) {
    return 'number';
  }
  if (type === 'text' || Number(column.max_length ?? 0) > 255) return 'textarea';
  return 'text';
}

/** Catalyst datetime rows look like "2021-08-25 13:55:04:904" — reduce to what <input type="datetime-local"> needs. */
function toDateTimeLocalValue(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const [datePart, timePart] = value.split(' ');
  if (!datePart) return '';
  const [hh = '00', mm = '00'] = (timePart ?? '').split(':');
  return `${datePart}T${hh}:${mm}`;
}

/** Reverses toDateTimeLocalValue back into Catalyst's expected "yyyy-MM-dd HH:mm:ss:SSS" shape. */
function fromDateTimeLocalValue(value: string): string {
  const [datePart, timePart] = value.split('T');
  if (!datePart) return '';
  const [hh = '00', mm = '00'] = (timePart ?? '').split(':');
  return `${datePart} ${hh}:${mm}:00:000`;
}

export interface DynamicFormProps {
  /** Live column metadata from table.getColumns() — this is what drives every field below. */
  columns: CatalystColumnMeta[];
  initialValues?: Record<string, unknown>;
  submitLabel: string;
  isSubmitting?: boolean;
  submitError?: string | null;
  onCancel?: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}

/**
 * Renders a create/edit form purely from a table's live column metadata, so
 * feature code never hardcodes field names for a schema it doesn't control.
 */
export function DynamicForm({
  columns,
  initialValues,
  submitLabel,
  isSubmitting,
  submitError,
  onCancel,
  onSubmit,
}: DynamicFormProps) {
  const editableColumns = useMemo(
    () =>
      columns
        .filter((c) => !SYSTEM_COLUMN_NAMES.has(c.column_name.toUpperCase()))
        .sort((a, b) => Number(a.column_sequence ?? 0) - Number(b.column_sequence ?? 0)),
    [columns]
  );

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const column of editableColumns) {
      const raw = initialValues?.[column.column_name];
      const kind = inferFieldKind(column);
      if (kind === 'datetime') {
        initial[column.column_name] = toDateTimeLocalValue(raw);
      } else if (kind === 'checkbox') {
        initial[column.column_name] = Boolean(raw);
      } else {
        initial[column.column_name] = raw ?? '';
      }
    }
    return initial;
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  function setValue(columnName: string, value: unknown) {
    setValues((prev) => ({ ...prev, [columnName]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const missing = editableColumns.filter((column) => {
      if (!column.is_mandatory || inferFieldKind(column) === 'checkbox') return false;
      const value = values[column.column_name];
      return value === '' || value === null || value === undefined;
    });

    if (missing.length > 0) {
      setValidationError(
        `${missing.map((c) => toFieldLabel(c.column_name)).join(', ')} ${missing.length > 1 ? 'are' : 'is'} required.`
      );
      return;
    }
    setValidationError(null);

    const payload: Record<string, unknown> = {};
    for (const column of editableColumns) {
      const kind = inferFieldKind(column);
      const raw = values[column.column_name];

      if (kind === 'datetime' && typeof raw === 'string' && raw) {
        payload[column.column_name] = fromDateTimeLocalValue(raw);
      } else if (kind === 'number' && raw !== '') {
        payload[column.column_name] = Number(raw);
      } else if (raw === '') {
        continue; // don't overwrite with empty strings for untouched optional fields
      } else {
        payload[column.column_name] = raw;
      }
    }

    onSubmit(payload);
  }

  if (editableColumns.length === 0) {
    return <p className="text-sm text-muted-foreground">No editable fields were found on this table.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {editableColumns.map((column) => {
        const kind = inferFieldKind(column);
        const label = toFieldLabel(column.column_name);
        const value = values[column.column_name];

        if (kind === 'checkbox') {
          return (
            <div key={column.column_id} className="flex items-center gap-2">
              <Checkbox
                id={column.column_name}
                checked={Boolean(value)}
                onChange={(e) => setValue(column.column_name, e.target.checked)}
              />
              <Label htmlFor={column.column_name}>{label}</Label>
            </div>
          );
        }

        if (kind === 'textarea') {
          return (
            <div key={column.column_id} className="space-y-1.5">
              <Label htmlFor={column.column_name}>
                {label}
                {column.is_mandatory && <span className="text-critical"> *</span>}
              </Label>
              <Textarea
                id={column.column_name}
                value={(value as string) ?? ''}
                required={column.is_mandatory}
                onChange={(e) => setValue(column.column_name, e.target.value)}
              />
            </div>
          );
        }

        return (
          <div key={column.column_id} className="space-y-1.5">
            <Label htmlFor={column.column_name}>
              {label}
              {column.is_mandatory && <span className="text-critical"> *</span>}
            </Label>
            <Input
              id={column.column_name}
              type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : kind === 'datetime' ? 'datetime-local' : 'text'}
              value={(value as string | number) ?? ''}
              required={column.is_mandatory}
              maxLength={column.max_length ? Number(column.max_length) : undefined}
              onChange={(e) => setValue(column.column_name, e.target.value)}
            />
          </div>
        );
      })}

      {(validationError || submitError) && <p className="text-sm text-critical">{validationError ?? submitError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
