"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Checkbox,
  Chip,
  Input,
  Label,
  Modal,
  NumberField,
  Radio,
  RadioGroup,
  TextField
} from "@heroui/react";
import { Brain, RotateCcw, SkipForward, Sparkles } from "lucide-react";
import { MOCK_PROFILE_TESTS } from "@/lib/seed/profileTests";

interface AddProfileTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    profileTestId: string;
    allowSkipIfCompleted: boolean;
    requireRetake: boolean;
    durationInMinutes: number;
  }) => void;
  initialData?: {
    title?: string;
    profileTestId?: string;
    allowSkipIfCompleted?: boolean;
    requireRetake?: boolean;
    durationInMinutes?: number;
  } | null;
}

export default function AddProfileTestModal({
  isOpen,
  onClose,
  onSave,
  initialData
}: AddProfileTestModalProps) {
  const [selectedTestId, setSelectedTestId] = useState<string>(
    initialData?.profileTestId || MOCK_PROFILE_TESTS[0]?.id || ""
  );
  const [customTitle, setCustomTitle] = useState<string>(initialData?.title || "");
  const [allowSkip, setAllowSkip] = useState<boolean>(
    initialData?.allowSkipIfCompleted ?? true
  );
  const [requireRetake, setRequireRetake] = useState<boolean>(
    initialData?.requireRetake ?? false
  );
  const [duration, setDuration] = useState<number>(
    initialData?.durationInMinutes || 10
  );

  useEffect(() => {
    if (initialData) {
      setSelectedTestId(initialData.profileTestId || MOCK_PROFILE_TESTS[0]?.id || "");
      setCustomTitle(initialData.title || "");
      setAllowSkip(initialData.allowSkipIfCompleted ?? true);
      setRequireRetake(initialData.requireRetake ?? false);
      setDuration(initialData.durationInMinutes || 10);
    } else if (MOCK_PROFILE_TESTS.length > 0) {
      const firstTest = MOCK_PROFILE_TESTS[0];
      setSelectedTestId(firstTest.id);
      setCustomTitle(`Diagnóstico: ${firstTest.title}`);
      setAllowSkip(true);
      setRequireRetake(false);
      setDuration(10);
    }
  }, [initialData, isOpen]);

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
    const found = MOCK_PROFILE_TESTS.find((t) => t.id === testId);
    if (found && (!customTitle || customTitle.startsWith("Diagnóstico:"))) {
      setCustomTitle(`Diagnóstico: ${found.title}`);
    }
  };

  const handleToggleSkip = (checked: boolean) => {
    setAllowSkip(checked);
    if (checked) {
      setRequireRetake(false);
    }
  };

  const handleToggleRetake = (checked: boolean) => {
    setRequireRetake(checked);
    if (checked) {
      setAllowSkip(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId) return;

    const selectedTest = MOCK_PROFILE_TESTS.find((t) => t.id === selectedTestId);
    const finalTitle = customTitle.trim() || selectedTest?.title || "Teste de Perfil";

    onSave({
      title: finalTitle,
      profileTestId: selectedTestId,
      allowSkipIfCompleted: allowSkip,
      requireRetake: requireRetake,
      durationInMinutes: Number(duration) || 10
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
                    <Brain className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Modal.Heading>
                      {initialData ? "Editar Teste de Perfil no Módulo" : "Adicionar Teste de Perfil ao Módulo"}
                    </Modal.Heading>
                    <p className="text-xs text-muted">
                      Incorpore avaliações comportamentais criadas no sistema ao fluxo do curso.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-6">
                <RadioGroup
                  value={selectedTestId}
                  onChange={handleSelectTest}
                  isRequired
                  className="gap-3"
                >
                  <Label>Selecione o teste de perfil criado</Label>
                  {MOCK_PROFILE_TESTS.map((test) => (
                    <Radio
                      key={test.id}
                      value={test.id}
                      className="items-start gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors selected:border-accent selected:bg-accent-soft hover:border-accent"
                    >
                      <Radio.Control className="mt-0.5">
                        <Radio.Indicator />
                      </Radio.Control>
                      <Radio.Content className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">{test.title}</span>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={test.status === 'published' ? 'success' : 'warning'}
                          >
                            {test.status === 'published' ? 'Publicado' : 'Rascunho'}
                          </Chip>
                        </span>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-muted">
                          {test.description}
                        </span>
                        <span className="mt-1.5 block text-[11px] font-medium text-muted">
                          {test.questions.length} perguntas · {test.categories.length} perfis/categorias
                        </span>
                      </Radio.Content>
                    </Radio>
                  ))}
                </RadioGroup>

                <TextField value={customTitle} onChange={setCustomTitle} isRequired>
                  <Label>Título exibido no módulo</Label>
                  <Input placeholder="Ex: Diagnóstico: Descubra seu Perfil de Liderança" />
                </TextField>

                <NumberField
                  value={duration}
                  onChange={(value) => setDuration(Number.isNaN(value) ? 10 : value)}
                  minValue={1}
                  maxValue={120}
                  className="w-full sm:w-48"
                >
                  <Label>Duração estimada (minutos)</Label>
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>

                <div className="space-y-3 border-t border-border pt-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles className="size-4 text-accent" aria-hidden="true" />
                    Regras para o aluno no curso
                  </p>
                  <p className="text-xs text-muted">
                    Defina como o sistema deve tratar alunos que já realizaram este mesmo teste em outro momento.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <Checkbox
                      isSelected={allowSkip}
                      onChange={handleToggleSkip}
                      className="items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-colors selected:border-accent selected:bg-accent-soft"
                    >
                      <Checkbox.Control className="mt-0.5">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <SkipForward className="size-4 text-accent" aria-hidden="true" />
                          Permitir pular se já tiver feito anteriormente
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          O aluno poderá aproveitar o resultado do teste que já realizou no sistema para concluir esta etapa sem precisar responder tudo de novo.
                        </span>
                      </Checkbox.Content>
                    </Checkbox>

                    <Checkbox
                      isSelected={requireRetake}
                      onChange={handleToggleRetake}
                      className="items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-colors selected:border-warning selected:bg-warning-soft"
                    >
                      <Checkbox.Control className="mt-0.5">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <RotateCcw className="size-4 text-warning" aria-hidden="true" />
                          Exigir que o aluno refaça o teste nesta aula
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          Mesmo que o aluno já tenha feito o teste em outra ocasião, ele será convidado a responder novamente nesta etapa específica do curso.
                        </span>
                      </Checkbox.Content>
                    </Checkbox>
                  </div>
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button type="button" variant="tertiary" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isDisabled={!selectedTestId || !customTitle.trim()}>
                  <Brain className="size-4" aria-hidden="true" />
                  {initialData ? "Salvar Alterações" : "Adicionar Teste ao Módulo"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
