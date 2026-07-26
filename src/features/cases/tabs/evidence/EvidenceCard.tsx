import { Image as ImageIcon, Video, Music, FileText, File as FileIcon } from 'lucide-react';
import type { CatalystColumnMeta } from '../../../../types/catalyst-sdk';
import type { CatalystRow } from '../../../../types/catalyst.types';
import { Badge } from '../../../../shared/components/ui/badge';
import { useEvidenceFileUrl } from '../../../../hooks/useEvidence';
import {
  EVIDENCE_TITLE_COLUMN_PATTERNS,
  FILE_KEY_COLUMN_PATTERNS,
  FILE_TYPE_COLUMN_PATTERNS,
  findColumnByPattern,
  formatCellValue,
} from '../../../../shared/lib/utils';
import { inferMediaKind, type MediaKind } from '../../../../shared/lib/media';

const KIND_ICON: Record<MediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  pdf: FileText,
  document: FileText,
  other: FileIcon,
};

export function EvidenceCard({
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
  const titleColumn = findColumnByPattern(schema, EVIDENCE_TITLE_COLUMN_PATTERNS);
  const fileKeyColumn = findColumnByPattern(schema, FILE_KEY_COLUMN_PATTERNS);
  const fileTypeColumn = findColumnByPattern(schema, FILE_TYPE_COLUMN_PATTERNS);

  const title = titleColumn ? String(row[titleColumn.column_name] ?? '') || `Evidence ${row.ROWID}` : `Evidence ${row.ROWID}`;
  const fileKey = fileKeyColumn ? String(row[fileKeyColumn.column_name] ?? '') : undefined;
  const kind = inferMediaKind(fileKey);
  const fileType = fileTypeColumn ? String(row[fileTypeColumn.column_name] ?? '') : kind;
  const Icon = KIND_ICON[kind];

  // Thumbnails only for images — cheap to fetch (local file store / static
  // demo asset), and much more useful in a grid than a generic file icon.
  const { url: thumbnailUrl } = useEvidenceFileUrl(fileKey, kind === 'image' && Boolean(fileKey));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted"
    >
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-md bg-muted">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="w-full min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatCellValue(row.CREATEDTIME)}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="neutral">{fileType || 'Unknown'}</Badge>
        {isDemo && <Badge variant="warning">Sample</Badge>}
      </div>
    </button>
  );
}
