"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Shield, Award, MessageSquare, Clock } from "lucide-react";
import { Button, Card, Description, Input, Label, Switch, TextField, toast } from "@heroui/react";

function SettingSwitch({
  isSelected,
  onChange,
  title,
  description,
}: {
  isSelected: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <Switch isSelected={isSelected} onChange={onChange} className="items-start gap-4">
      <Switch.Control className="mt-0.5">
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Content className="text-left">
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="mt-1 block text-sm font-normal text-muted">{description}</span>
      </Switch.Content>
    </Switch>
  );
}

export default function AdminCursoConfiguracoesPage() {
  const params = useParams();
  const id = params.id as string;

  // Estados do formulário
  const [config, setConfig] = useState({
    enableCertificates: true,
    dripContent: false,
    enableComments: true,
    requireSequentialProgress: true,
    expirationDays: "365",
    maxStudents: ""
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (field: keyof typeof config) => {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Simular requisição ao servidor
    await new Promise(resolve => setTimeout(resolve, 800));

    setIsSaving(false);
    toast.success("Configurações salvas", { description: "As preferências do curso foram atualizadas." });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <header className="sticky top-[92px] z-10 -mx-1 flex flex-col gap-4 rounded-xl border border-border bg-surface/95 p-4 shadow-elev-2 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <Link href={`/admin/cursos/${id}`} className="inline-flex items-center gap-2 text-muted hover:text-accent transition-colors text-sm font-medium mb-4">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Voltar para o Curso
          </Link>
          <h1 className="text-3xl font-display font-black text-foreground">Configurações</h1>
          <p className="text-muted mt-1">Regras de negócio, certificados e preferências do curso #{id}.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link
            href={`/admin/cursos/${id}`}
            className="flex-1 md:flex-none text-center bg-background-secondary hover:bg-surface-hover text-foreground px-6 py-3 rounded-lg font-semibold border border-border transition-all"
          >
            Voltar
          </Link>
          <Button variant="primary" className="flex-1 gap-2 md:flex-none" isDisabled={isSaving} onClick={handleSave}>
            <Save className="size-4" aria-hidden="true" />
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Progresso e Certificados */}
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Award className="size-5 text-accent" aria-hidden="true" />
              Progresso e certificados
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-6">
            <SettingSwitch
              isSelected={config.enableCertificates}
              onChange={() => handleToggle('enableCertificates')}
              title="Emitir certificado automático"
              description="Alunos recebem o certificado em PDF assim que concluem 100% das aulas."
            />
            <SettingSwitch
              isSelected={config.requireSequentialProgress}
              onChange={() => handleToggle('requireSequentialProgress')}
              title="Progresso sequencial obrigatório"
              description="O aluno só pode assistir a próxima aula após concluir a anterior."
            />
          </Card.Content>
        </Card>

        {/* Interação do Aluno */}
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <MessageSquare className="size-5 text-accent" aria-hidden="true" />
              Interação
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-6">
            <SettingSwitch
              isSelected={config.enableComments}
              onChange={() => handleToggle('enableComments')}
              title="Permitir comentários"
              description="Habilita a área de dúvidas e discussões em cada aula."
            />
            <SettingSwitch
              isSelected={config.dripContent}
              onChange={() => handleToggle('dripContent')}
              title="Conteúdo gotejado (drip content)"
              description="Libera os módulos gradualmente após a compra, em vez de tudo de uma vez."
            />
          </Card.Content>
        </Card>

        {/* Regras de Acesso */}
        <Card className="md:col-span-2">
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Shield className="size-5 text-accent" aria-hidden="true" />
              Regras de acesso
            </Card.Title>
          </Card.Header>
          <Card.Content className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <TextField type="number" name="expirationDays" value={config.expirationDays} onChange={(v) => setConfig((prev) => ({ ...prev, expirationDays: v }))}>
              <Label className="flex items-center gap-1.5">
                <Clock className="size-4 text-muted" aria-hidden="true" />
                Tempo de acesso (dias)
              </Label>
              <Input placeholder="Ex: 365" />
              <Description>Deixe em branco ou use zero para acesso vitalício.</Description>
            </TextField>

            <TextField type="number" name="maxStudents" value={config.maxStudents} onChange={(v) => setConfig((prev) => ({ ...prev, maxStudents: v }))}>
              <Label>Limite de alunos</Label>
              <Input placeholder="Sem limite" />
              <Description>Máximo de matriculados permitidos. Deixe em branco para ilimitado.</Description>
            </TextField>
          </Card.Content>
        </Card>

      </div>
    </div>
  );
}
