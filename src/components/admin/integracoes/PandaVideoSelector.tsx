"use client";

import { Modal } from "@heroui/react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Film,
  Folder,
  FolderOpen,
  LibraryBig,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatPandaVideoDuration,
  PANDA_VIDEO_PAGE_SIZE,
  type PandaVideoFolder,
  type PandaVideoSelection,
} from "@/lib/pandavideo";
import { cn } from "@/lib/utils";

type FolderCrumb = Pick<PandaVideoFolder, "id" | "name">;

type PandaVideoSelectorProps = {
  value?: string;
  currentVideoUrl?: string;
  onChange: (video: PandaVideoSelection | null) => void;
};

type ApiErrorBody = {
  error?: string;
  code?: string;
};

class LibraryRequestError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "LibraryRequestError";
  }
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const data = await response.json().catch(() => ({})) as T & ApiErrorBody;
  if (!response.ok) {
    throw new LibraryRequestError(data.error || "Não foi possível consultar o PandaVideo.", data.code);
  }
  return data;
}

function thumbnailStyle(url: string | null) {
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
}

function folderLabel(video: PandaVideoSelection, folderNames: Record<string, string>) {
  if (!video.folderId) return "Pasta raiz";
  return folderNames[video.folderId] ?? `Pasta ${video.folderId.slice(0, 8)}…`;
}

function formatCreatedAt(value: string | null) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function buildVideosUrl(page: number, search: string, folderId: string | null) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PANDA_VIDEO_PAGE_SIZE),
  });
  if (search) params.set("title", search);
  else if (folderId) params.set("folder_id", folderId);
  return `/api/admin/pandavideo/videos?${params.toString()}`;
}

export function PandaVideoSelector({ value, currentVideoUrl, onChange }: PandaVideoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<PandaVideoSelection | null>(null);
  const [isHydratingSelection, setIsHydratingSelection] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [folderPath, setFolderPath] = useState<FolderCrumb[]>([]);
  const [folderNames, setFolderNames] = useState<Record<string, string>>({});
  const [folders, setFolders] = useState<PandaVideoFolder[]>([]);
  const [videos, setVideos] = useState<PandaVideoSelection[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const requestIdRef = useRef(0);

  const currentFolder = folderPath.at(-1) ?? null;
  const currentFolderId = currentFolder?.id ?? null;
  const isSearchPending = search.trim() !== debouncedSearch;
  const displayedVideo = value && selectedVideo?.id === value ? selectedVideo : null;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!value) return;

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setIsHydratingSelection(true);
    });
    requestJson<{ video: PandaVideoSelection }>(
      `/api/admin/pandavideo/videos/${encodeURIComponent(value)}`,
      controller.signal,
    )
      .then(({ video }) => setSelectedVideo(video))
      .catch((selectionError: unknown) => {
        if (selectionError instanceof DOMException && selectionError.name === "AbortError") return;
        setSelectedVideo({
          id: value,
          title: "Vídeo PandaVideo selecionado",
          status: "",
          videoPlayer: currentVideoUrl ?? "",
          length: 0,
          thumbnail: null,
          preview: null,
          folderId: null,
          createdAt: null,
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsHydratingSelection(false);
      });

    return () => controller.abort();
  }, [currentVideoUrl, value]);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setIsLoading(true);
      setError(null);
      setErrorCode(undefined);
      setPage(1);
    });

    const foldersUrl = currentFolderId
      ? `/api/admin/pandavideo/folders?parent_folder_id=${encodeURIComponent(currentFolderId)}`
      : "/api/admin/pandavideo/folders";

    const foldersRequest = debouncedSearch
      ? Promise.resolve({ folders: [] as PandaVideoFolder[] })
      : requestJson<{ folders: PandaVideoFolder[] }>(foldersUrl, controller.signal);

    Promise.all([
      foldersRequest,
      requestJson<{ videos: PandaVideoSelection[]; hasMore: boolean }>(
        buildVideosUrl(1, debouncedSearch, currentFolderId),
        controller.signal,
      ),
    ])
      .then(([folderData, videoData]) => {
        if (requestId !== requestIdRef.current) return;
        setFolders(folderData.folders);
        setVideos(videoData.videos);
        setHasMore(videoData.hasMore);
        setFolderNames((previous) => {
          const next = { ...previous };
          for (const folder of folderData.folders) next[folder.id] = folder.name;
          return next;
        });
      })
      .catch((libraryError: unknown) => {
        if (libraryError instanceof DOMException && libraryError.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        setFolders([]);
        setVideos([]);
        setHasMore(false);
        setError(libraryError instanceof Error ? libraryError.message : "Não foi possível abrir a biblioteca.");
        setErrorCode(libraryError instanceof LibraryRequestError ? libraryError.code : undefined);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsLoading(false);
      });

    return () => controller.abort();
  }, [currentFolderId, debouncedSearch, isOpen, refreshKey]);

  const selectedFolderLabel = useMemo(
    () => displayedVideo ? folderLabel(displayedVideo, folderNames) : "",
    [displayedVideo, folderNames],
  );

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    const requestId = requestIdRef.current;
    setIsLoadingMore(true);
    try {
      const data = await requestJson<{ videos: PandaVideoSelection[]; hasMore: boolean }>(
        buildVideosUrl(nextPage, debouncedSearch, currentFolderId),
      );
      if (requestId !== requestIdRef.current) return;
      setVideos((previous) => {
        const knownIds = new Set(previous.map((video) => video.id));
        return [...previous, ...data.videos.filter((video) => !knownIds.has(video.id))];
      });
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (loadMoreError) {
      if (requestId !== requestIdRef.current) return;
      setError(loadMoreError instanceof Error ? loadMoreError.message : "Não foi possível carregar mais vídeos.");
    } finally {
      if (requestId === requestIdRef.current) setIsLoadingMore(false);
    }
  };

  const handleSelect = (video: PandaVideoSelection) => {
    if (video.status !== "CONVERTED" || !video.videoPlayer) return;
    setSelectedVideo(video);
    onChange(video);
    setIsOpen(false);
  };

  const handleRemove = () => {
    setSelectedVideo(null);
    onChange(null);
  };

  return (
    <div className="mt-4 space-y-3">
      {value && isHydratingSelection && !displayedVideo ? (
        <div className="h-24 animate-pulse rounded-xl border border-border bg-background" />
      ) : displayedVideo ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div
              className="aspect-video w-full shrink-0 rounded-lg bg-background bg-cover bg-center sm:w-36"
              style={thumbnailStyle(displayedVideo.thumbnail)}
              aria-hidden="true"
            >
              {!displayedVideo.thumbnail && (
                <div className="grid size-full place-items-center text-muted"><Film className="size-7" /></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                  Selecionado
                </span>
                {displayedVideo.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Clock3 className="size-3" /> {formatPandaVideoDuration(displayedVideo.length)}
                  </span>
                )}
              </div>
              <p className="truncate text-sm font-semibold text-foreground" title={displayedVideo.title}>{displayedVideo.title}</p>
              <p className="mt-1 truncate text-xs text-muted">{selectedFolderLabel}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Trocar vídeo
              </button>
              <button
                type="button"
                onClick={handleRemove}
                aria-label="Remover vídeo PandaVideo"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-background p-4 text-left transition-colors hover:border-accent hover:bg-accent/5"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
            <LibraryBig className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Selecionar da biblioteca PandaVideo</span>
            <span className="mt-0.5 block text-xs text-muted">Busque em toda a conta ou navegue por pastas</span>
          </span>
          <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </button>
      )}

      <Modal.Root isOpen={isOpen} onOpenChange={setIsOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside" className="sm:max-w-5xl">
            <Modal.Dialog className="overflow-hidden">
              <Modal.Header className="border-b border-border px-5 py-4 sm:px-6">
                <div>
                  <Modal.Heading className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                    <LibraryBig className="size-5 text-accent" /> Biblioteca PandaVideo
                  </Modal.Heading>
                  <p className="mt-1 text-xs text-muted">Escolha um vídeo convertido para esta aula.</p>
                </div>
              </Modal.Header>

              <Modal.Body className="min-h-[560px] p-0">
                <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur sm:px-6">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar em toda a biblioteca..."
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent"
                    />
                    {isSearchPending && (
                      <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-accent" />
                    )}
                  </label>

                  {debouncedSearch ? (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Search className="size-3.5" /> Resultados em toda a biblioteca para “{debouncedSearch}”
                    </div>
                  ) : (
                    <nav className="flex items-center gap-1 overflow-x-auto text-xs" aria-label="Pastas do PandaVideo">
                      <button
                        type="button"
                        onClick={() => setFolderPath([])}
                        className={cn(
                          "shrink-0 rounded-md px-2 py-1 font-medium transition-colors hover:bg-background hover:text-accent",
                          folderPath.length === 0 ? "text-accent" : "text-muted",
                        )}
                      >
                        Todos os vídeos
                      </button>
                      {folderPath.map((folder, index) => (
                        <span key={folder.id} className="flex shrink-0 items-center gap-1">
                          <ChevronRight className="size-3 text-muted" />
                          <button
                            type="button"
                            onClick={() => setFolderPath((previous) => previous.slice(0, index + 1))}
                            className={cn(
                              "max-w-48 truncate rounded-md px-2 py-1 font-medium transition-colors hover:bg-background hover:text-accent",
                              index === folderPath.length - 1 ? "text-accent" : "text-muted",
                            )}
                          >
                            {folder.name}
                          </button>
                        </span>
                      ))}
                    </nav>
                  )}
                </div>

                <div className="space-y-6 px-5 py-5 sm:px-6">
                  {error ? (
                    <div className="grid min-h-72 place-items-center text-center">
                      <div className="max-w-sm">
                        <div className="mx-auto grid size-12 place-items-center rounded-full bg-warning/10 text-warning">
                          <Film className="size-5" />
                        </div>
                        <h3 className="mt-4 text-sm font-bold text-foreground">Não foi possível abrir a biblioteca</h3>
                        <p className="mt-2 text-xs leading-relaxed text-muted">{error}</p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRefreshKey((key) => key + 1)}
                            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"
                          >
                            <RefreshCw className="size-3.5" /> Tentar novamente
                          </button>
                          {errorCode === "PANDAVIDEO_NOT_CONFIGURED" && (
                            <Link
                              href="/admin/integracoes/pandavideo"
                              className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground"
                            >
                              Configurar integração
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : isLoading ? (
                    <div className="space-y-5">
                      {!debouncedSearch && (
                        <div className="grid grid-cols-1 gap-2">
                          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-background" />)}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-xl bg-background" />)}
                      </div>
                    </div>
                  ) : (
                    <>
                      {!debouncedSearch && folders.length > 0 && (
                        <section>
                          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Pastas</h3>
                          <div className="grid grid-cols-1 gap-2">
                            {folders.map((folder) => (
                              <button
                                key={folder.id}
                                type="button"
                                onClick={() => setFolderPath((previous) => [...previous, { id: folder.id, name: folder.name }])}
                                className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-accent hover:bg-accent/5"
                              >
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-warning/10 text-warning">
                                  <Folder className="size-4.5 fill-current/20" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block break-words text-sm font-semibold leading-snug text-foreground">{folder.name}</span>
                                  <span className="mt-0.5 block text-[11px] text-muted">{folder.videosCount} vídeo(s)</span>
                                </span>
                                <ChevronRight className="size-4 shrink-0 text-muted group-hover:text-accent" />
                              </button>
                            ))}
                          </div>
                        </section>
                      )}

                      <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                            {debouncedSearch ? "Resultados" : currentFolder ? `Vídeos em ${currentFolder.name}` : "Vídeos na raiz"}
                          </h3>
                          <span className="text-[11px] text-muted">{videos.length} carregado(s)</span>
                        </div>

                        {videos.length === 0 ? (
                          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border bg-background/50 text-center">
                            <div>
                              <FolderOpen className="mx-auto size-8 text-muted" />
                              <p className="mt-3 text-sm font-semibold text-foreground">Nenhum vídeo encontrado</p>
                              <p className="mt-1 text-xs text-muted">
                                {debouncedSearch ? "Tente outro título ou termo de busca." : "Esta pasta não possui vídeos convertidos."}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {videos.map((video) => {
                              const selectable = video.status === "CONVERTED" && Boolean(video.videoPlayer);
                              const active = value === video.id;
                              return (
                                <button
                                  key={video.id}
                                  type="button"
                                  disabled={!selectable}
                                  onClick={() => handleSelect(video)}
                                  className={cn(
                                    "group overflow-hidden rounded-xl border bg-surface text-left shadow-sm transition-all",
                                    selectable ? "border-border hover:-translate-y-0.5 hover:border-accent hover:shadow-md" : "cursor-not-allowed border-border opacity-60",
                                    active && "border-accent ring-2 ring-accent/15",
                                  )}
                                >
                                  <span
                                    className="relative block aspect-video bg-background bg-cover bg-center"
                                    style={thumbnailStyle(video.thumbnail)}
                                  >
                                    {!video.thumbnail && (
                                      <span className="grid size-full place-items-center text-muted"><Film className="size-8" /></span>
                                    )}
                                    <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                                      {formatPandaVideoDuration(video.length)}
                                    </span>
                                    {active && (
                                      <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
                                        <Check className="size-3.5" />
                                      </span>
                                    )}
                                  </span>
                                  <span className="block p-3">
                                    <span className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-foreground" title={video.title}>{video.title}</span>
                                    <span className="mt-2 flex items-center gap-1.5 truncate text-[11px] text-muted">
                                      <Folder className="size-3 shrink-0" /> {folderLabel(video, folderNames)}
                                    </span>
                                    <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
                                      <CalendarDays className="size-3" /> {formatCreatedAt(video.createdAt)}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {hasMore && (
                          <div className="mt-5 flex justify-center">
                            <button
                              type="button"
                              disabled={isLoadingMore}
                              onClick={handleLoadMore}
                              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
                            >
                              {isLoadingMore && <LoaderCircle className="size-3.5 animate-spin" />}
                              {isLoadingMore ? "Carregando..." : "Carregar mais vídeos"}
                            </button>
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </div>
              </Modal.Body>

              <Modal.Footer className="border-t border-border px-5 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-background"
                >
                  Fechar
                </button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
