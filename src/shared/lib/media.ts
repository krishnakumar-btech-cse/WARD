export type MediaKind = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'other';

const EXTENSION_MAP: Record<string, MediaKind> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  heic: 'image',
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  webm: 'video',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  ogg: 'audio',
  aac: 'audio',
  pdf: 'pdf',
  doc: 'document',
  docx: 'document',
  txt: 'document',
  rtf: 'document',
  csv: 'document',
  xls: 'document',
  xlsx: 'document',
};

/** Infers a coarse media kind from a filename or Stratus object key, to pick the right viewer. */
export function inferMediaKind(nameOrKey: string | undefined): MediaKind {
  if (!nameOrKey) return 'other';
  const extension = nameOrKey.split('.').pop()?.toLowerCase();
  if (!extension) return 'other';
  return EXTENSION_MAP[extension] ?? 'other';
}

const MIME_MAP: Record<MediaKind, string> = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  pdf: 'application/pdf',
  document: 'application/octet-stream',
  other: 'application/octet-stream',
};

export function guessMimeType(kind: MediaKind): string {
  return MIME_MAP[kind];
}
