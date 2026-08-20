const YOUTUBE_PATTERNS = [
  /(?:youtube(?:-nocookie)?\.com\/watch\?v=)([\w-]{11})/,
  /(?:youtube(?:-nocookie)?\.com\/embed\/)([\w-]{11})/,
  /(?:youtube(?:-nocookie)?\.com\/shorts\/)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
];

/** Aceita uma URL completa do YouTube ou já um ID de 11 caracteres. */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
