import type { CatalystRow } from '../../types/catalyst.types';
import type { ResolvedTableDisplay } from './demoData';
import { findColumnByPattern, CASE_ID_COLUMN_PATTERNS } from './utils';

/**
 * Filters a resolved table down to rows belonging to one case, by its
 * CaseId-pattern column. Demo tables are treated as belonging to whichever
 * case is open — each demo dataset only ever represents a single case, so
 * there's nothing to filter.
 */
export function scopeToCase<T extends CatalystRow>(table: ResolvedTableDisplay<T>, caseId: string): T[] {
  if (table.isDemo) return table.rows;
  const caseColumn = findColumnByPattern(table.columns, CASE_ID_COLUMN_PATTERNS);
  if (!caseColumn) return table.rows;
  return table.rows.filter((row) => String(row[caseColumn.column_name] ?? '') === caseId);
}
