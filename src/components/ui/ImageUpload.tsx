"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, ImagePlus, Link2, Trash2, Upload } from "lucide-react";
import { Button, Input, Label, TextField, toast } from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  MAX_IMAGE_BYTES,
  PUBLIC_ASSETS_BUCKET,
  deleteImageFromStorage,
  isManagedStorageUrl,
  uploadImageToStorage,
  type ImageFolder,
  type UploadPhase,
} from "@/lib/imageOptimization";

/** Proporções suportadas pela moldura de preview. */
export type ImageUploadAspect = "square" | "video" | "wide" | "portrait" | "free";

export type ImageUploadProps = {
  /** URL atual da imagem (pode vir do storage ou ser um link externo já cadastrado). */
  value: string | null | undefined;
  /** Recebe a URL pública após o envio, ou `null` quando a imagem é removida. */
  onChange: (url: string | null) => void;
  label: string;
  /** Pasta dentro do bucket. Para avatares, use o id do usuário. */
  folder: ImageFolder | (string & {});
  bucket?: string;
  aspect?: ImageUploadAspect;
  /** Texto de apoio abaixo do campo. Ex.: "Recomendado: 1280x720px". */
  description?: string;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Mostra o campo recolhido "ou colar uma URL". Padrão: true. */
  allowUrl?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
  /** Classes aplicadas à moldura de preview — ex.: `rounded-full` para avatares. */
  previewClassName?: string;
  /** Conteúdo do estado vazio. Ex.: as iniciais do usuário no lugar do ícone. */
  fallback?: ReactNode;
  /** Esconde visualmente a label padrão gerada pelo componente */
  hideLabel?: boolean;
};

const ASPECT_CLASS: Record<ImageUploadAspect, string> = {
  square: "aspect-square max-w-44",
  video: "aspect-video",
  wide: "aspect-[1.91/1]",
  portrait: "aspect-2/3 max-w-40",
  free: "min-h-40",
};

/** Sem `maxWidth` explícito, a proporção define um teto razoável de resolução. */
const ASPECT_MAX_WIDTH: Record<ImageUploadAspect, number> = {
  square: 800,
  video: 1600,
  wide: 1600,
  portrait: 900,
  free: 1600,
};

const PHASE_LABEL: Record<UploadPhase, string> = {
  optimizing: "Otimizando imagem…",
  uploading: "Enviando…",
};

/**
 * Campo padrão de imagem da plataforma.
 *
 * Toda imagem é convertida para WebP com qualidade máxima de 70% **no navegador**,
 * antes de tocar a rede — é o que mantém o storage enxuto e o carregamento leve.
 * Ao substituir uma imagem, o arquivo anterior é apagado do bucket, desde que
 * seja um arquivo nosso (URLs externas coladas pelo admin são apenas descartadas).
 */
export function ImageUpload({
  value,
  onChange,
  label,
  folder,
  bucket = PUBLIC_ASSETS_BUCKET,
  aspect = "video",
  description,
  quality,
  maxWidth,
  maxHeight,
  allowUrl = true,
  isRequired = false,
  isDisabled = false,
  className,
  previewClassName,
  fallback,
  hideLabel,
}: ImageUploadProps) {
  const inputId = useId();
  const urlFieldId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const [isUrlOpen, setIsUrlOpen] = useState(false);

  useEffect(() => {
    setHasPreviewError(false);
  }, [value]);

  const isBusy = phase !== null;
  const isLocked = isDisabled || isBusy;
  const resolvedMaxWidth = maxWidth ?? ASPECT_MAX_WIDTH[aspect];
  const resolvedMaxHeight = maxHeight ?? ASPECT_MAX_WIDTH[aspect];

  const openPicker = () => {
    if (isLocked) return;
    inputRef.current?.click();
  };

  const processFile = async (file: File) => {
    if (isLocked) return;

    if (!file.type.startsWith("image/")) {
      toast.danger("Formato inválido", {
        description: "Selecione um arquivo de imagem (PNG, JPG, WEBP ou GIF).",
      });
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.danger("Imagem muito grande", {
        description: "O arquivo precisa ter no máximo 5 MB.",
      });
      return;
    }

    const previous = value;
    setHasPreviewError(false);

    try {
      const supabase = createClient();
      const { publicUrl } = await uploadImageToStorage(supabase, {
        file,
        folder,
        bucket,
        quality,
        maxWidth: resolvedMaxWidth,
        maxHeight: resolvedMaxHeight,
        onPhase: setPhase,
      });

      onChange(publicUrl);

      // Melhor-esforço: não deixa o arquivo antigo ocupando espaço no bucket.
      if (previous && previous !== publicUrl && isManagedStorageUrl(previous, bucket)) {
        void deleteImageFromStorage(supabase, previous, bucket);
      }

      toast.success("Imagem enviada!", {
        description: "Convertida para WebP para manter a plataforma leve.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Não foi possível enviar a imagem.";
      toast.danger("Erro ao enviar imagem", { description: message });
    } finally {
      setPhase(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (isLocked || !value) return;

    const previous = value;
    onChange(null);
    setHasPreviewError(false);

    if (isManagedStorageUrl(previous, bucket)) {
      await deleteImageFromStorage(createClient(), previous, bucket);
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
    setHasPreviewError(false);
    onChange(trimmed);
    setUrlDraft("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={inputId}
        className={hideLabel ? "sr-only" : "block text-sm font-medium text-foreground"}
      >
        {label}
        {isRequired && <span className="ml-0.5 text-danger">*</span>}
      </label>

      <div
        role="button"
        tabIndex={isLocked ? -1 : 0}
        aria-label={value ? `Substituir imagem: ${label}` : `Enviar imagem: ${label}`}
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
          "image-upload-zone relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface-secondary transition-colors outline-none",
          "hover:border-accent/60 focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/25",
          isLocked && "pointer-events-none opacity-60",
          ASPECT_CLASS[aspect],
          previewClassName
        )}
      >
        {value && !hasPreviewError ? (
          // URL pode ser externa, arbitrária ou de outro host — next/image exigiria
          // liberar cada domínio em remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`Pré-visualização: ${label}`}
            className="size-full object-cover"
            onError={() => setHasPreviewError(true)}
          />
        ) : fallback && !hasPreviewError ? (
          <div className="flex size-full items-center justify-center">{fallback}</div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
              {hasPreviewError ? <ImagePlus className="size-5" /> : <Upload className="size-5" />}
            </span>
            <p className="text-sm font-medium text-foreground">
              {hasPreviewError ? "Não foi possível carregar a imagem" : "Clique ou arraste uma imagem"}
            </p>
            {aspect !== "square" && <p className="text-xs text-muted">PNG, JPG ou WEBP até 5 MB</p>}
          </div>
        )}

        {isBusy && (
          <div className="image-upload-loader">
            <span className="image-upload-spinner" aria-hidden="true" />
            <span className="image-upload-status">{PHASE_LABEL[phase]}</span>
          </div>
        )}
      </div>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif"
        className="sr-only"
        disabled={isLocked}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void processFile(file);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" type="button" onPress={openPicker} isDisabled={isLocked}>
          <Upload className="size-3.5" aria-hidden="true" />
          {value ? "Trocar imagem" : "Enviar imagem"}
        </Button>

        {value && (
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
      </div>

      {description && <p className="text-xs text-muted">{description}</p>}

      {allowUrl && (
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
            <ChevronDown
              className={cn("size-3.5 transition-transform", isUrlOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          {isUrlOpen && (
            <div id={urlFieldId} className="space-y-1 pt-2">
              <div className="flex items-end gap-2">
                <TextField value={urlDraft} onChange={setUrlDraft} fullWidth isDisabled={isLocked}>
                  <Label className="sr-only">URL da imagem</Label>
                  <Input type="url" placeholder="https://…" />
                </TextField>
                <Button size="sm" variant="secondary" type="button" onPress={applyUrl} isDisabled={isLocked}>
                  Usar
                </Button>
              </div>
              <p className="text-xs text-muted">Imagens externas não passam pela otimização em WebP.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
