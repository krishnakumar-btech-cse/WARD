import { Mic, Image as ImageIcon, FileText, StickyNote, Bookmark, Star } from 'lucide-react';
import type { CatalystColumnMeta } from '../../../../types/catalyst-sdk';
import type { CatalystRow } from '../../../../types/catalyst.types';
import { Badge } from '../../../../shared/components/ui/badge';
import {
  LABEL_COLUMN_PATTERNS,
  ENTRY_TYPE_COLUMN_PATTERNS,
  CONTENT_COLUMN_PATTERNS,
  BOOKMARK_COLUMN_PATTERNS,
  KEY_FINDING_COLUMN_PATTERNS,
  findColumnByPattern,
  formatCellValue,
} from '../../../../shared/lib/utils';

const ENTRY_TYPE_ICON: Record<string, typeof StickyNote> = {
  voice: Mic,
  image: ImageIcon,
  pdf: FileText,
  document: FileText,
  text: StickyNote,
};

export function NotebookEntryCard({
  row,
  schema,
  isDemo,
  onOpen,
}: {
  row: CatalystRow;
  schema: CatalystColumnMeta[];
  isDemo: boolean;
  onOpen: () => void;
}) {
  const titleColumn = findColumnByPattern(schema, LABEL_COLUMN_PATTERNS);
  const entryTypeColumn = findColumnByPattern(schema, ENTRY_TYPE_COLUMN_PATTERNS);
  const contentColumn = findColumnByPattern(schema, CONTENT_COLUMN_PATTERNS);
  const bookmarkColumn = findColumnByPattern(schema, BOOKMARK_COLUMN_PATTERNS);
  const keyFindingColumn = findColumnByPattern(schema, KEY_FINDING_COLUMN_PATTERNS);

  const title = titleColumn ? String(row[titleColumn.column_name] ?? '') || `Entry ${row.ROWID}` : `Entry ${row.ROWID}`;
  const entryType = entryTypeColumn ? String(row[entryTypeColumn.column_name] ?? '') : 'Text';
  const content = contentColumn ? String(row[contentColumn.column_name] ?? '') : '';
  const isBookmarked = bookmarkColumn ? Boolean(row[bookmarkColumn.column_name]) : false;
  const isKeyFinding = keyFindingColumn ? Boolean(row[keyFindingColumn.column_name]) : false;

  const Icon = ENTRY_TYPE_ICON[entryType.toLowerCase()] ?? StickyNote;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {isKeyFinding && <Star className="h-3.5 w-3.5 shrink-0 text-primary" fill="currentColor" />}
          {isBookmarked && <Bookmark className="h-3.5 w-3.5 shrink-0 text-warning" fill="currentColor" />}
        </div>
        {content && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{content}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral">{entryType}</Badge>
          {isDemo && <Badge variant="warning">Sample</Badge>}
          <span className="text-xs text-muted-foreground">{formatCellValue(row.CREATEDTIME)}</span>
        </div>
      </div>
    </button>
  );
}
