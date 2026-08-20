"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { Input, Label, TextField } from "@heroui/react";
import { Film, Tv } from "lucide-react";
import { PandaVideoSelector } from "@/components/admin/integracoes/PandaVideoSelector";
import PandaVideoPlayer from "@/components/classroom/PandaVideoPlayer";
import { extractYouTubeId, youtubeEmbedUrl } from "@/lib/editor/youtube";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { value: "youtube", label: "YouTube", icon: Tv },
  { value: "panda", label: "PandaVideo", icon: Film },
  { value: "url", label: "Outro link", icon: Film },
] as const;

export const lessonVideoBlockConfig = {
  type: "lessonVideo",
  propSchema: {
    provider: { default: "youtube" as const, values: ["youtube", "panda", "url"] as const },
    videoId: { default: "" as const },
    url: { default: "" as const },
    caption: { default: "" as const },
  },
  content: "none",
} as const;

export const LessonVideoBlock = createReactBlockSpec(lessonVideoBlockConfig, {
  render: ({ block, editor }) => {
    const { provider, videoId, url, caption } = block.props;
    const readOnly = !editor.isEditable;

    const update = (patch: Partial<typeof block.props>) => {
      editor.updateBlock(block, { props: { ...block.props, ...patch } });
    };

    return (
      <div className="my-2 w-full overflow-hidden rounded-xl border border-border bg-surface">
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
            {PROVIDERS.map((option) => {
              const Icon = option.icon;
              const active = provider === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  contentEditable={false}
                  onClick={() => update({ provider: option.value })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface-secondary",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        {!readOnly && (
          <div className="space-y-3 p-3" contentEditable={false}>
            {provider === "youtube" && (
              <TextField
                aria-label="URL ou ID do vídeo no YouTube"
                value={videoId}
                onChange={(value) => update({ videoId: extractYouTubeId(value) ?? value })}
              >
                <Label>Link ou ID do YouTube</Label>
                <Input placeholder="https://youtu.be/..." />
              </TextField>
            )}

            {provider === "panda" && (
              <PandaVideoSelector
                value={videoId}
                currentVideoUrl={url}
                onChange={(video) => update({ videoId: video?.id ?? "", url: video?.videoPlayer ?? "" })}
              />
            )}

            {provider === "url" && (
              <TextField aria-label="URL de incorporação do vídeo" value={url} onChange={(value) => update({ url: value })}>
                <Label>Link de incorporação (embed)</Label>
                <Input placeholder="https://player.vimeo.com/video/..." />
              </TextField>
            )}

            <TextField aria-label="Legenda do vídeo" value={caption} onChange={(value) => update({ caption: value })}>
              <Label>Legenda (opcional)</Label>
              <Input placeholder="Descrição curta exibida abaixo do vídeo" />
            </TextField>
          </div>
        )}

        <VideoPreview provider={provider} videoId={videoId} url={url} />

        {caption && <p className="px-3 pb-3 text-xs text-muted">{caption}</p>}
      </div>
    );
  },
});

function VideoPreview({ provider, videoId, url }: { provider: string; videoId: string; url: string }) {
  if (provider === "youtube" && videoId) {
    return (
      <div className="aspect-video w-full bg-black">
        <iframe
          src={youtubeEmbedUrl(videoId)}
          className="size-full"
          allow="accelerated-video-playback; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Pré-visualização do vídeo do YouTube"
        />
      </div>
    );
  }

  if (provider === "panda") {
    return <PandaVideoPlayer embedUrl={url} className="aspect-video w-full bg-black" />;
  }

  if (provider === "url" && url) {
    return (
      <div className="aspect-video w-full bg-black">
        <iframe src={url} className="size-full" allowFullScreen title="Pré-visualização do vídeo" />
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center bg-surface-secondary text-sm text-muted">
      Nenhum vídeo selecionado ainda.
    </div>
  );
}
