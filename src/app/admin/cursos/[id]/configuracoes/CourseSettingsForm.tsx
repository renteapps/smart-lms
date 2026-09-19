"use client";

import { SwitchRow } from "@/components/ui/SwitchRow";
import { useState } from "react";
import { PageHeader } from "@/components/ui/editorial";
import { useRouter } from "next/navigation";
import { Save, Shield, Award, MessageSquare, Clock, GalleryHorizontalEnd } from "lucide-react";
import { Button, Card, Description, Input, Label, TextField } from "@heroui/react";
import { toast } from "@/lib/toast";
import { saveCourse } from "@/app/actions/admin/catalog";
import type { Course } from "@/types/course";

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
    <SwitchRow isSelected={isSelected} onChange={onChange} label={title} description={description} />
  );
}

export function CourseSettingsForm({ course }: { course: Course }) {
  const router = useRouter();
  const id = course.id;

  const isGallery = course.layout === "gallery";

  const [config, setConfig] = useState({
    enableCertificates: course.enableCertificates ?? true,
    dripContent: course.dripContent ?? false,
    enableComments: course.enableComments ?? true,
    requireSequentialProgress: course.requireSequentialProgress ?? true,
    homeCarousel: course.homeCarousel ?? false,
    expirationDays: course.accessExpirationDays != null ? String(course.accessExpirationDays) : "",
    maxStudents: course.maxStudents != null ? String(course.maxStudents) : "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (field: keyof typeof config) => {
    setConfig((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    const expirationDays = config.expirationDays.trim() === "" ? null : Number(config.expirationDays);
    const maxStudents = config.maxStudents.trim() === "" ? null : Number(config.maxStudents);

    const result = await saveCourse({
      id,
      enableCertificates: config.enableCertificates,
      dripContent: config.dripContent,
      enableComments: config.enableComments,
      requireSequentialProgress: config.requireSequentialProgress,
      homeCarousel: isGallery ? config.homeCarousel : undefined,
      accessExpirationDays: expirationDays,
      maxStudents,
    });

    setIsSaving(false);

    if (!result.success) {
      toast.danger("Não foi possível salvar", { description: result.message });
      return;
    }

    toast.success("Configurações salvas", { description: "As preferências do curso foram atualizadas." });
    router.refresh();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-16">
      <PageHeader
        sticky
        back={{ href: `/admin/cursos/${id}`, label: "Voltar para o curso" }}
        eyebrow="Cursos"
        title="Configurações"
        description={`Regras de negócio, certificados e preferências do curso ${course.title}.`}
        actions={
          <Button variant="primary" className="gap-2" isDisabled={isSaving} onPress={handleSave}>
            <Save className="size-4" aria-hidden="true" />
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        }
      />

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
              onChange={() => handleToggle("enableCertificates")}
              title="Emitir certificado automático"
              description="Alunos recebem o certificado em PDF assim que concluem 100% das aulas."
            />
            <SettingSwitch
              isSelected={config.requireSequentialProgress}
              onChange={() => handleToggle("requireSequentialProgress")}
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
              onChange={() => handleToggle("enableComments")}
              title="Permitir comentários"
              description="Habilita a área de dúvidas e discussões em cada aula."
            />
            <SettingSwitch
              isSelected={config.dripContent}
              onChange={() => handleToggle("dripContent")}
              title="Conteúdo gotejado (drip content)"
              description="Libera os módulos gradualmente após a compra, em vez de tudo de uma vez."
            />
          </Card.Content>
        </Card>

        {/* Vitrine — só existe para o curso galeria */}
        {isGallery && (
          <Card className="md:col-span-2">
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <GalleryHorizontalEnd className="size-5 text-accent" aria-hidden="true" />
                Vitrine
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-6">
              <SettingSwitch
                isSelected={config.homeCarousel}
                onChange={() => handleToggle("homeCarousel")}
                title="Carrossel na Home"
                description="Mostra as 8 primeiras aulas deste curso (conforme ordenadas no painel) num carrossel na home do aluno."
              />
            </Card.Content>
          </Card>
        )}

        {/* Regras de Acesso */}
        <Card className="md:col-span-2">
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Shield className="size-5 text-accent" aria-hidden="true" />
              Regras de acesso
            </Card.Title>
          </Card.Header>
          <Card.Content className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <TextField
              type="number"
              name="expirationDays"
              value={config.expirationDays}
              onChange={(v) => setConfig((prev) => ({ ...prev, expirationDays: v }))}
            >
              <Label className="flex items-center gap-1.5">
                <Clock className="size-4 text-muted" aria-hidden="true" />
                Tempo de acesso (dias)
              </Label>
              <Input placeholder="Ex: 365" />
              <Description>Deixe em branco ou use zero para acesso vitalício.</Description>
            </TextField>

            <TextField
              type="number"
              name="maxStudents"
              value={config.maxStudents}
              onChange={(v) => setConfig((prev) => ({ ...prev, maxStudents: v }))}
            >
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
