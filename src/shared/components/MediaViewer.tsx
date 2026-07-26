import { Image as ImageIcon, Video, Music, FileText, File as FileIcon, Download } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { MediaKind } from '../lib/media';

const KIND_ICON: Record<MediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  pdf: FileText,
  document: FileText,
  other: FileIcon,
};

function ViewerPlaceholder({ kind, message }: { kind: MediaKind; message: string }) {
  const Icon = KIND_ICON[kind];
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export interface MediaViewerProps {
  kind: MediaKind;
  title: string;
  hasFile: boolean;
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
  url: string | null;
  emptyMessage?: string;
}

/**
 * Pure, presentational file viewer — image/video/audio/PDF inline, anything
 * else falls back to a download link. Shared by Evidence and Notebook (and
 * any future file-attached resource); each owns its own data-fetching hook
 * and passes the resolved {url,error,isLoading} in.
 */
export function MediaViewer({
  kind,
  title,
  hasFile,
  isDemo,
  isLoading,
  error,
  url,
  emptyMessage = 'No file has been attached yet.',
}: MediaViewerProps) {
  if (!hasFile) {
    return <ViewerPlaceholder kind="other" message={emptyMessage} />;
  }

  if (isDemo) {
    return <ViewerPlaceholder kind={kind} message="Sample record — no file preview available." />;
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  if (error || !url) {
    return <ViewerPlaceholder kind={kind} message="Preview unavailable. The file may still be processing." />;
  }

  if (kind === 'image') {
    return (
      <img src={url} alt={title} className="max-h-[420px] w-full rounded-lg border border-border bg-muted object-contain" />
    );
  }

  if (kind === 'video') {
    return <video src={url} controls className="max-h-[420px] w-full rounded-lg border border-border bg-black" />;
  }

  if (kind === 'audio') {
    return (
      <div className="rounded-lg border border-border bg-muted p-4">
        <audio src={url} controls className="w-full" />
      </div>
    );
  }

  if (kind === 'pdf') {
    return <iframe src={url} title={title} className="h-[420px] w-full rounded-lg border border-border" />;
  }

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted text-center">
      <FileText className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No inline preview for this file type.</p>
      <a href={url} download={title} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <Download className="h-4 w-4" />
        Download
      </a>
    </div>
  );
}
