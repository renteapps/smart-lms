'use client';

import React, { useState } from 'react';
import { Sparkles, Bot } from 'lucide-react';
import {
  Button,
  Description,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Select,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (settings: { tone: string; length: string; extraInstructions: string }) => void;
  isGenerating: boolean;
}

const TONE_OPTIONS = [
  "Didático, claro e engajador",
  "Acadêmico e formal",
  "Descontraído e bem-humorado",
  "Inspiracional e motivador",
];

const LENGTH_OPTIONS = [
  "Resumo rápido (curto)",
  "Resumo detalhado (médio)",
  "Artigo completo (longo)",
];

export function AIGenerationModal({ isOpen, onClose, onGenerate, isGenerating }: AIGenerationModalProps) {
  const [tone, setTone] = useState<string>(TONE_OPTIONS[0]);
  const [length, setLength] = useState<string>(LENGTH_OPTIONS[1]);
  const [extraInstructions, setExtraInstructions] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ tone, length, extraInstructions });
  };

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open && !isGenerating) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog className="max-w-xl">
            <Modal.Header>
              <div className="flex items-center gap-3">
                <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                  <Bot className="size-5" aria-hidden="true" />
                </Modal.Icon>
                <div>
                  <Modal.Heading className="font-display text-lg font-bold">
                    Gerar Conteúdo com IA
                  </Modal.Heading>
                  <p className="text-xs text-muted">
                    A IA vai ler a transcrição do vídeo e escrever a descrição e os metadados da aula.
                  </p>
                </div>
              </div>
            </Modal.Header>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <Modal.Body className="space-y-6 py-2">
                <div className="space-y-2">
                  <Select
                    selectedKey={tone}
                    onSelectionChange={(key) => setTone(String(key))}
                  >
                    <Label>Tom do Texto</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {TONE_OPTIONS.map((opt) => (
                          <ListBoxItem key={opt} id={opt}>
                            {opt}
                          </ListBoxItem>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Select
                    selectedKey={length}
                    onSelectionChange={(key) => setLength(String(key))}
                  >
                    <Label>Tamanho Desejado</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {LENGTH_OPTIONS.map((opt) => (
                          <ListBoxItem key={opt} id={opt}>
                            {opt}
                          </ListBoxItem>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                <TextField value={extraInstructions} onChange={setExtraInstructions} fullWidth>
                  <Label>Instruções Adicionais (Opcional)</Label>
                  <TextArea
                    rows={3}
                    placeholder="Ex: Focar muito na parte sobre Hooks; evite falar sobre o assunto X."
                  />
                  <Description>A IA levará isso em conta ao gerar os textos.</Description>
                </TextField>
              </Modal.Body>

              <Modal.Footer>
                <Button variant="tertiary" type="button" onClick={onClose} isDisabled={isGenerating}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" isDisabled={isGenerating}>
                  <Sparkles className="size-4" aria-hidden="true" />
                  {isGenerating ? "Gerando..." : "Gerar"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
