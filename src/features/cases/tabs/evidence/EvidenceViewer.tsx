import { useEvidenceFileUrl } from '../../../../hooks/useEvidence';
import { MediaViewer } from '../../../../shared/components/MediaViewer';
import { inferMediaKind } from '../../../../shared/lib/media';

export function EvidenceViewer({
  fileKey,
  title,
  isDemo,
}: {
  fileKey: string | undefined;
  title: string;
  isDemo: boolean;
}) {
  const kind = inferMediaKind(fileKey);
  const { url, error, isLoading } = useEvidenceFileUrl(fileKey, !isDemo && Boolean(fileKey));

  return (
    <MediaViewer
      kind={kind}
      title={title}
      hasFile={Boolean(fileKey)}
      isDemo={isDemo}
      isLoading={isLoading}
      error={error}
      url={url}
      emptyMessage="No file has been attached to this evidence record yet."
    />
  );
}
