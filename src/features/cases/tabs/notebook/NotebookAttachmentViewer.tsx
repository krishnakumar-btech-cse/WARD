import { useNotebookFileUrl } from '../../../../hooks/useNotebookEntries';
import { MediaViewer } from '../../../../shared/components/MediaViewer';
import { inferMediaKind } from '../../../../shared/lib/media';

export function NotebookAttachmentViewer({
  fileKey,
  title,
  isDemo,
}: {
  fileKey: string | undefined;
  title: string;
  isDemo: boolean;
}) {
  const kind = inferMediaKind(fileKey);
  const { url, error, isLoading } = useNotebookFileUrl(fileKey, !isDemo && Boolean(fileKey));

  return (
    <MediaViewer
      kind={kind}
      title={title}
      hasFile={Boolean(fileKey)}
      isDemo={isDemo}
      isLoading={isLoading}
      error={error}
      url={url}
      emptyMessage="This is a text entry — no voice, image, or document attached."
    />
  );
}
