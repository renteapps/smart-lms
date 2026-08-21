"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp, Trash2, File, Link2 } from "lucide-react";
import { toast } from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  id?: string;
  name: string;
  url: string;
  sizeBytes?: number;
};

type FileUploadProps = {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  label?: string;
  description?: string;
  maxFiles?: number;
  maxSizeMB?: number;
};

export function FileUpload({
  value,
  onChange,
  label = "Anexos e Materiais",
  description = "PDF, ZIP, Imagens (Max. 50MB)",
  maxFiles = 10,
  maxSizeMB = 50,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (isUploading) return;
    inputRef.current?.click();
  };

  const processFiles = async (files: FileList | File[]) => {
    if (isUploading) return;
    
    const validFiles = Array.from(files).filter(file => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.danger(`Arquivo muito grande: ${file.name}`, {
          description: `O arquivo precisa ter no máximo ${maxSizeMB} MB.`,
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    
    if (value.length + validFiles.length > maxFiles) {
      toast.danger("Muitos arquivos", {
        description: `Você pode anexar no máximo ${maxFiles} arquivos.`,
      });
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    const newUploads: UploadedFile[] = [];

    try {
      for (const file of validFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const storagePath = `lesson-materials/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("public-assets")
          .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
        
        if (uploadError) throw new Error(`Erro ao enviar "${file.name}": ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from("public-assets")
          .getPublicUrl(storagePath);

        newUploads.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: publicUrlData.publicUrl,
          sizeBytes: file.size,
        });
      }

      onChange([...value, ...newUploads]);
      toast.success("Arquivos enviados com sucesso!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Não foi possível enviar os arquivos.";
      toast.danger("Erro no upload", { description: message });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const fileToRemove = value[indexToRemove];
    const newValue = value.filter((_, idx) => idx !== indexToRemove);
    onChange(newValue);
    
    // Melhor esforço para remover do storage
    if (fileToRemove.url.includes("public-assets/lesson-materials")) {
      const pathMatch = fileToRemove.url.match(/public-assets\/(lesson-materials\/.*)/);
      if (pathMatch && pathMatch[1]) {
        createClient().storage.from("public-assets").remove([pathMatch[1]]).catch(console.warn);
      }
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length > 0) {
      void processFiles(event.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((file, idx) => (
            <li key={file.id || idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-surface-secondary rounded-md text-muted">
                  <File className="size-4" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-foreground truncate" title={file.name}>
                    {file.name}
                  </span>
                  <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
                    <Link2 className="size-3" /> Ver link
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-danger"
                aria-label={`Remover ${file.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length < maxFiles && (
        <div
          role="button"
          tabIndex={isUploading ? -1 : 0}
          aria-busy={isUploading}
          data-dragging={isDragging ? "true" : "false"}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors outline-none",
            isUploading ? "opacity-60 pointer-events-none" : "hover:border-accent hover:bg-surface-secondary/50 cursor-pointer focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent",
            isDragging && "border-accent bg-accent/5"
          )}
        >
          <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-muted mb-3 group-hover:text-accent transition-colors">
            <FileUp className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-foreground transition-colors group-hover:text-accent">
            {isUploading ? "Enviando arquivos..." : "Clique ou arraste para fazer upload de arquivos"}
          </p>
          {description && <p className="text-xs text-muted mt-1">{description}</p>}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        disabled={isUploading}
        onChange={(e) => {
          if (e.target.files) void processFiles(e.target.files);
        }}
      />
    </div>
  );
}
