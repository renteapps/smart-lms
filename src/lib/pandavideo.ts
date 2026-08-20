export const PANDA_VIDEO_PAGE_SIZE = 24;
export const PANDA_VIDEO_MAX_PAGE_SIZE = 48;

export type PandaVideoSelection = {
  id: string;
  title: string;
  status: string;
  videoPlayer: string;
  length: number;
  thumbnail: string | null;
  preview: string | null;
  folderId: string | null;
  createdAt: string | null;
};

export type PandaVideoFolder = {
  id: string;
  name: string;
  parentFolderId: string | null;
  videosCount: number;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrZero(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function normalizePandaVideo(value: unknown): PandaVideoSelection | null {
  if (!isRecord(value)) return null;

  const id = stringOrNull(value.id);
  const title = stringOrNull(value.title);
  if (!id || !title) return null;

  return {
    id,
    title,
    status: stringOrNull(value.status) ?? "",
    videoPlayer: stringOrNull(value.video_player) ?? "",
    length: numberOrZero(value.length),
    thumbnail: stringOrNull(value.thumbnail),
    preview: stringOrNull(value.preview),
    folderId: stringOrNull(value.folder_id),
    createdAt: stringOrNull(value.created_at),
  };
}

export function normalizePandaVideos(value: unknown): PandaVideoSelection[] {
  const items = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.videos)
      ? value.videos
      : [];

  return items
    .map(normalizePandaVideo)
    .filter((video): video is PandaVideoSelection => video !== null);
}

export function normalizePandaFolders(value: unknown): PandaVideoFolder[] {
  const items = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.folders)
      ? value.folders
      : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = stringOrNull(item.id);
    const name = stringOrNull(item.name);
    if (!id || !name || item.status === false) return [];

    return [{
      id,
      name,
      parentFolderId: stringOrNull(item.parent_folder_id),
      videosCount: numberOrZero(item.videos_count),
    }];
  });
}

export function filterPandaFoldersByParent(
  folders: PandaVideoFolder[],
  parentFolderId: string | null,
): PandaVideoFolder[] {
  return folders.filter((folder) => folder.parentFolderId === parentFolderId);
}

export function secondsToLessonMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(numberOrZero(seconds) / 60));
}

export function formatPandaVideoDuration(seconds: number): string {
  const safeSeconds = Math.floor(numberOrZero(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export type PandaVideoListRequest = {
  page: number;
  limit: number;
  title: string;
  folderId: string | null;
  rootFolder: boolean;
};

export function parsePandaVideoListRequest(searchParams: URLSearchParams): PandaVideoListRequest {
  const requestedPage = Number(searchParams.get("page"));
  const requestedLimit = Number(searchParams.get("limit"));
  const title = (searchParams.get("title") ?? "").trim().slice(0, 200);
  const folderId = (searchParams.get("folder_id") ?? "").trim() || null;

  return {
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    limit: Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, PANDA_VIDEO_MAX_PAGE_SIZE)
      : PANDA_VIDEO_PAGE_SIZE,
    title,
    // A busca textual é global. Pasta e raiz só se aplicam ao modo de navegação.
    folderId: title ? null : folderId,
    rootFolder: !title && !folderId,
  };
}

export function buildPandaVideoListSearchParams(request: PandaVideoListRequest): URLSearchParams {
  const params = new URLSearchParams({
    page: String(request.page),
    limit: String(request.limit),
    status: "CONVERTED",
  });

  if (request.title) params.set("title", request.title);
  else if (request.folderId) params.set("folder_id", request.folderId);
  else if (request.rootFolder) params.set("root_folder", "1");

  return params;
}
