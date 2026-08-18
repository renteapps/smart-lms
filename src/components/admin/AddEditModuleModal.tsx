"use client";

import React, { useState, useEffect } from "react";
import { Button, Chip, Input, Label, Modal, TextArea, TextField } from "@heroui/react";
import { Layers, Image as ImageIcon, Sparkles, Check } from "lucide-react";
import { Module } from "@/types/course";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface AddEditModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; coverUrl: string }) => void;
  initialModule?: Module | null;
}

const PRESET_COVERS = [
  {
    name: "Tecnologia",
    url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop"
  },
  {
    name: "Código & Frontend",
    url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop"
  },
  {
    name: "Design & UX",
    url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1200&auto=format&fit=crop"
  },
  {
    name: "Liderança & Negócios",
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop"
  }
];

export default function AddEditModuleModal({
  isOpen,
  onClose,
  onSave,
  initialModule
}: AddEditModuleModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  useEffect(() => {
    if (initialModule) {
      setTitle(initialModule.title || "");
      setDescription(initialModule.description || "");
      setCoverUrl(initialModule.coverUrl || PRESET_COVERS[0].url);
    } else {
      setTitle("");
      setDescription("");
      setCoverUrl(PRESET_COVERS[0].url);
    }
  }, [initialModule, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      coverUrl: coverUrl.trim() || PRESET_COVERS[0].url
    });

    onClose();
  };

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <Layers className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Modal.Heading>
                      {initialModule ? "Editar Módulo" : "Adicionar Novo Módulo"}
                    </Modal.Heading>
                    <p className="text-xs text-muted">
                      Defina o nome, descrição detalhada e a capa em proporção 16:9.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-6">
                <TextField value={title} onChange={setTitle} isRequired>
                  <Label>Nome / Título do Módulo</Label>
                  <Input placeholder="Ex: Módulo 3: Gerenciamento Avançado de Estado" />
                </TextField>

                <TextField value={description} onChange={setDescription}>
                  <Label>Descrição do Módulo</Label>
                  <TextArea
                    rows={3}
                    placeholder="Descreva os objetivos de aprendizagem e os tópicos abordados neste módulo..."
                  />
                </TextField>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <ImageIcon className="size-4 text-accent" aria-hidden="true" />
                      Capa do Módulo
                    </p>
                    <Chip variant="soft" size="sm">16:9 HD</Chip>
                  </div>

                  <ImageUpload
                    label="Capa do módulo"
                    value={coverUrl}
                    onChange={(url) => setCoverUrl(url ?? "")}
                    folder="modules"
                    aspect="video"
                    description="Recomendado: 1280x720px (16:9)."
                  />

                  <div>
                    <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted">
                      <Sparkles className="size-3.5 text-warning" aria-hidden="true" /> Sugestões de capas 16:9
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PRESET_COVERS.map((preset) => {
                        const isSelected = coverUrl === preset.url;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setCoverUrl(preset.url)}
                            className={`group relative aspect-video overflow-hidden rounded-lg border text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-accent ${
                              isSelected ? "border-accent ring-2 ring-accent" : "border-border hover:border-accent"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preset.url} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
                            <span className="absolute inset-0 flex flex-col justify-between bg-black/40 p-1.5">
                              {isSelected && (
                                <span className="self-end rounded-full bg-accent p-0.5 text-accent-foreground">
                                  <Check className="size-3" aria-hidden="true" />
                                </span>
                              )}
                              <span className="mt-auto truncate text-[10px] font-semibold text-white">
                                {preset.name}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button type="button" variant="tertiary" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isDisabled={!title.trim()}>
                  <Layers className="size-4" aria-hidden="true" />
                  {initialModule ? "Salvar Alterações" : "Criar Módulo"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
