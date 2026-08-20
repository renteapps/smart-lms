"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Video } from "lucide-react";

interface PandaVideo {
  id: string;
  title: string;
  status: string;
  preview?: string;
}

interface PandaVideoSelectorProps {
  value?: string;
  onChange: (id: string, url: string) => void;
}

export function PandaVideoSelector({ value, onChange }: PandaVideoSelectorProps) {
  const [videos, setVideos] = useState<PandaVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/pandavideo/videos");
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Erro ao buscar vídeos");
        }
        const data = await res.json();
        // A API do Panda retorna os videos em `videos` array
        if (data.videos && Array.isArray(data.videos)) {
          setVideos(data.videos);
        } else if (Array.isArray(data)) {
          setVideos(data);
        } else {
          setVideos([]);
        }
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const videoId = e.target.value;
    if (!videoId) return;
    const video = videos.find((v) => v.id === videoId);
    // `video_player` é a URL de embed pronta que a API do PandaVideo devolve;
    // sem ela não há como montar um iframe válido (o domínio inclui um hash
    // de pullzone que não dá pra inferir a partir do id do vídeo).
    const url = (video as { video_player?: string } | undefined)?.video_player ?? "";
    if (!url) {
      toast.error("Esse vídeo não retornou uma URL de player válida do PandaVideo.");
      return;
    }
    onChange(videoId, url);
  };

  if (error) {
    return <div className="text-sm text-warning mt-2 bg-warning/10 p-2 rounded-lg">PandaVideo não configurado ou com erro: {error}</div>;
  }

  return (
    <div className="mt-4 p-4 border border-border rounded-lg bg-surface flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Video className="size-4 text-accent" />
        <span className="text-sm font-medium">Ou selecione um vídeo do PandaVideo</span>
      </div>
      
      <select
        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
        value={value || ""}
        onChange={handleSelection}
        disabled={loading}
      >
        <option value="">{loading ? "Carregando vídeos..." : "Selecione um vídeo..."}</option>
        {videos.map(video => (
          <option key={video.id} value={video.id}>
            {video.title} {video.status ? `(${video.status})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
