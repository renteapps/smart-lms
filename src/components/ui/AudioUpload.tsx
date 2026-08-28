"use client";

import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { AudioLines, ChevronDown, Link2, Trash2, Upload } from "lucide-react";
import {
  Button,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  ProgressBar,
  Select,
  TextField,
  toast,
} from "@heroui/react";
import { AudioScrubber } from "@/components/audio/AudioScrubber";
import { createClient } from "@/lib/supabase/client";
import {
  ARTICLE_AUDIO_BUCKET,
  AUDIO_PRESETS,
  MAX_AUDIO_INPUT_BYTES,
  deleteAudioFromStorage,
  formatAudioDuration,
  isManagedAudioUrl,
  uploadAudioToStorage,
  type AudioPhase,
  type AudioPreset,
} from "@/lib/audioOptimization";
import { formatFileSize } from "@/lib/agentFileUpload";
import { cn } from "@/lib/utils";

export type AudioUploadValue = {
  url: string;
  duration: number;
  peaks: number[] | null;
};

export type AudioUploadProps = {
  value: AudioUploadValue;
  /** Recebe URL, duração e envoltória após o envio, ou o valor vazio ao remover. */
  onChange: (value: AudioUploadValue) => void;
  label: string;
  folder?: string;
  bucket?: string;
  description?: string;
  isDisabled?: boolean;
  className?: string;
};

const PHASE_LABEL: Record<AudioPhase, string> = {
  reading: "Lendo o arquivo…",
  converting: "Convertendo e comprimindo…",
  uploading: "Enviando…",
};

const EMPTY: AudioUploadValue = { url: "", duration: 0, peaks: null };

const ACCEPT = "audio/*,.mp3,.m4a,.aac,.wav,.ogg,.opus,.flac,.mp4";

/**
 * Campo padrão de áudio da plataforma.
 *
 * Todo arquivo é convertido para AAC em MP4 **no navegador**, antes de tocar a
 * rede: um WAV de 300 MB nunca chega a ser enviado, e o que fica no storage é um
 * arquivo de poucos MB que toca em qualquer aparelho. A conversão também devolve
 * a duração e a forma de onda, então esses campos deixam de ser digitados à mão.
 *
 * O campo de URL continua aberto embaixo, recolhido: artigos antigos apontam
 * para um CDN externo e precisam seguir editáveis sem reenviar o áudio.
 */
export function AudioUpload({
  value,
  onChange,
  label,
  folder = "blog",
  bucket = ARTICLE_AUDIO_BUCKET,
  description,
  isDisabled = false,
  className,
}: AudioUploadProps) {
  const inputId = useId();
  const urlFieldId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<AudioPhase | null>(null);
  const [progress, setProgress] = useState(0);
  const [preset, setPreset] = useState<AudioPreset>("voz");
  const [savings, setSavings] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUrlOpen, setIsUrlOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [previewTime, setPreviewTime] = useState(0);

  const isBusy = phase !== null;
  const isLocked = isDisabled || isBusy;

  const openPicker = () => {
    if (isLocked) return;
    inputRef.current?.click();
  };

  const processFile = async (file: File) => {
    if (isLocked) return;

    if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|ogg|opus|flac|mp4)$/i.test(file.name)) {
      toast.danger("Formato inválido", {
        description: "Envie MP3, M4A, AAC, WAV, OGG ou FLAC.",
      });
      return;
    }

    if (file.size > MAX_AUDIO_INPUT_BYTES) {
      toast.danger("Arquivo muito grande", {
        description: `O áudio precisa ter no máximo ${Math.round(MAX_AUDIO_INPUT_BYTES / 1024 / 1024)} MB.`,
      });
      return;
    }

    const previous = value.url;
    setProgress(0);
    setSavings(null);

    try {
      const supabase = createClient();
      const result = await uploadAudioToStorage(supabase, {
        file,
        folder,
        bucket,
        preset,
        onPhase: setPhase,
        onProgress: setProgress,
      });

      onChange({ url: result.publicUrl, duration: result.durationSeconds, peaks: result.peaks });
      setPreviewTime(0);
      setSavings(`${formatFileSize(result.originalBytes)} → ${formatFileSize(result.file.size)}`);

      // Melhor-esforço: não deixa o arquivo antigo ocupando espaço no bucket.
      if (previous && previous !== result.publicUrl && isManagedAudioUrl(previous, bucket)) {
        void deleteAudioFromStorage(supabase, previous, bucket);
      }

      toast.success("Áudio enviado!", {
        description: `Convertido para AAC — ${formatFileSize(result.originalBytes)} viraram ${formatFileSize(result.file.size)}.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Não foi possível enviar o áudio.";
      toast.danger("Erro ao enviar áudio", { description: message });
    } finally {
      setPhase(null);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (isLocked || !value.url) return;

    const previous = value.url;
    onChange(EMPTY);
    setSavings(null);
    setPreviewTime(0);

    if (isManagedAudioUrl(previous, bucket)) {
      await deleteAudioFromStorage(createClient(), previous, bucket);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  const applyUrl = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    // URL externa não passa pela conversão, então não há envoltória para desenhar.
    onChange({ url: trimmed, duration: value.duration, peaks: null });
    setUrlDraft("");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
      </label>

      {value.url ? (
        <div className="space-y-3 rounded-lg border border-border bg-surface-secondary p-4">
          <AudioScrubber
            currentTime={previewTime}
            duration={value.duration}
            onSeek={setPreviewTime}
            peaks={value.peaks}
            size="sm"
            isDisabled={!value.duration}
            label="Pré-visualização da forma de onda"
          />
          {/* O <audio> nativo basta aqui: o admin só precisa conferir se subiu o
              arquivo certo, e trazer o player do produto para dentro do editor
              exigiria o contexto de reprodução que só existe na área pública. */}
          <audio src={value.url} controls preload="metadata" className="w-full">
            Seu navegador não suporta reprodução de áudio.
          </audio>
          <p className="text-xs text-muted">
            <span data-numeric>{formatAudioDuration(value.duration)}</span>
            {savings && <> · {savings}</>}
            {!isManagedAudioUrl(value.url, bucket) && <> · arquivo externo</>}
          </p>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={isLocked ? -1 : 0}
          aria-label={`Enviar áudio: ${label}`}
          aria-busy={isBusy}
          aria-disabled={isLocked}
          data-dragging={isDragging ? "true" : "false"}
          onClick={openPicker}
          onKeyDown={handleKeyDown}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isLocked) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-secondary p-4 text-center outline-none transition-colors",
            "hover:border-accent/60 focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/25",
            isDragging && "border-accent",
            isLocked && "pointer-events-none opacity-60"
          )}
        >
          <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
            <AudioLines className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-foreground">Clique ou arraste um arquivo de áudio</p>
          <p className="text-xs text-muted">
            MP3, M4A, WAV, OGG ou FLAC até {Math.round(MAX_AUDIO_INPUT_BYTES / 1024 / 1024)} MB
          </p>
        </div>
      )}

      {isBusy && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-foreground">
            <span>{PHASE_LABEL[phase]}</span>
            {phase === "converting" && <span data-numeric>{Math.round(progress * 100)}%</span>}
          </div>
          <ProgressBar
            value={phase === "converting" ? progress * 100 : undefined}
            isIndeterminate={phase !== "converting"}
            color="accent"
            size="sm"
            aria-label="Progresso do envio do áudio"
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </div>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={isLocked}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void processFile(file);
        }}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Button size="sm" variant="secondary" type="button" onPress={openPicker} isDisabled={isLocked}>
          <Upload className="size-3.5" aria-hidden="true" />
          {value.url ? "Trocar áudio" : "Enviar áudio"}
        </Button>

        {value.url && (
          <Button
            size="sm"
            variant="tertiary"
            type="button"
            onPress={() => void handleRemove()}
            isDisabled={isLocked}
          >
            <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
            Remover
          </Button>
        )}

        <Select
          selectedKey={preset}
          onSelectionChange={(key) => setPreset(String(key) as AudioPreset)}
          isDisabled={isLocked}
          className="w-40"
        >
          <Label>Qualidade</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {Object.entries(AUDIO_PRESETS).map(([id, option]) => (
                <ListBoxItem key={id} id={id} textValue={option.label}>
                  {option.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <p className="text-xs text-muted">
        {description ?? AUDIO_PRESETS[preset].description}{" "}
        A conversão acontece no seu navegador — arquivos longos levam alguns minutos.
      </p>

      <div>
        <button
          type="button"
          onClick={() => setIsUrlOpen((open) => !open)}
          aria-expanded={isUrlOpen}
          aria-controls={urlFieldId}
          className="inline-flex items-center gap-1.5 rounded-md text-xs text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Link2 className="size-3.5" aria-hidden="true" />
          ou colar uma URL
          <ChevronDown className={cn("size-3.5 transition-transform", isUrlOpen && "rotate-180")} aria-hidden="true" />
        </button>

        {isUrlOpen && (
          <div id={urlFieldId} className="space-y-1 pt-2">
            <div className="flex items-end gap-2">
              <TextField value={urlDraft} onChange={setUrlDraft} fullWidth isDisabled={isLocked}>
                <Label className="sr-only">URL do áudio</Label>
                <Input type="url" placeholder="https://…" />
              </TextField>
              <Button size="sm" variant="secondary" type="button" onPress={applyUrl} isDisabled={isLocked}>
                Usar
              </Button>
            </div>
            <p className="text-xs text-muted">
              Áudio externo não é comprimido nem ganha forma de onda — informe a duração à mão.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
