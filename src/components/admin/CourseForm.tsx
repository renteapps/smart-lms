"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Image as ImageIcon, Save, Tag, Type } from "lucide-react";
import {
  Button,
  Card,
  Description,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { saveCourse } from "@/app/actions/admin/catalog";
import type { Course } from "@/types/course";

const categorias = [
  { id: "Comportamental", label: "Comportamental" },
  { id: "Liderança", label: "Liderança" },
  { id: "Produtividade", label: "Produtividade" },
  { id: "Técnico", label: "Técnico" },
];

const statusOptions = [
  { id: "Rascunho", label: "Rascunho" },
  { id: "Publicado", label: "Publicado" },
  { id: "Arquivado", label: "Arquivado" },
];

const acessoOptions = [
  { id: "Gratuito", label: "Gratuito" },
  { id: "Pago", label: "Pago" },
  { id: "Assinantes", label: "Somente assinantes" },
];


export function CourseForm({ course }: { course?: Course }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [coverUrl, setCoverUrl] = useState(course?.coverUrl || "");
  const [status, setStatus] = useState(course?.isPublished ? "Publicado" : "Rascunho");
  const [access, setAccess] = useState("Pago");
  const [category, setCategory] = useState(course?.category || "");

  const isEditing = Boolean(course);
  const backHref = isEditing ? `/admin/cursos/${course!.id}` : "/admin/cursos";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const title = formData.get("title") as string;

    startTransition(async () => {
      const res = await saveCourse({
        id: course?.id,
        title,
        shortDescription: formData.get("shortDescription") as string,
        description: formData.get("description") as string,
        coverUrl: coverUrl || undefined,
        category: category || "Geral",
        isPublished: status === "Publicado",
        tags: (formData.get("tags") as string)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });

      if (res.success) {
        toast.success(isEditing ? "Curso atualizado" : "Curso criado");
        router.push(`/admin/cursos/${isEditing ? course!.id : res.data?.id}`);
        router.refresh();
      } else {
        toast.danger("Não foi possível salvar o curso", { description: res.message });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-8 pb-16">
      <header className="sticky top-[92px] z-10 -mx-1 flex flex-col gap-4 rounded-xl border border-border bg-surface/95 p-4 shadow-elev-2 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {isEditing ? "Voltar para o curso" : "Voltar para cursos"}
          </Link>
          <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
            {isEditing ? "Editar curso" : "Novo curso"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isEditing
              ? "Atualize as informações, capa e configurações do curso."
              : "Preencha as informações básicas para criar um novo curso."}
          </p>
        </div>
        <div className="flex w-full gap-3 md:w-auto">
          <Link
            href={backHref}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-background-secondary px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover md:flex-none"
          >
            Cancelar
          </Link>
          <Button type="submit" variant="primary" isDisabled={isPending} className="flex-1 gap-2 md:flex-none">
            <Save className="size-4" aria-hidden="true" />
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Formulário principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Type className="size-5 text-accent" aria-hidden="true" />
                Informações básicas
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <TextField name="title" defaultValue={course?.title || ""} isRequired>
                <Label>Título do curso</Label>
                <Input placeholder="Ex.: Formação em Liderança" />
              </TextField>
              <TextField name="shortDescription" defaultValue={course?.shortDescription || ""}>
                <Label>Descrição curta</Label>
                <TextArea rows={3} placeholder="Um resumo rápido sobre o curso" className="resize-none" />
              </TextField>
              <TextField name="description" defaultValue={course?.description || ""}>
                <Label>Descrição detalhada</Label>
                <TextArea rows={6} placeholder="Descrição completa do que será ensinado" />
              </TextField>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <ImageIcon className="size-5 text-accent" aria-hidden="true" />
                Capa e vídeo promo
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-6">
              <ImageUpload
                label="Imagem de capa (thumbnail)"
                value={coverUrl}
                onChange={(url) => setCoverUrl(url ?? "")}
                folder="courses"
                aspect="video"
                description="Recomendado: 1280x720px (16:9), máximo de 5MB."
              />
              <TextField name="videoUrl" type="url">
                <Label>Link do vídeo promocional (opcional)</Label>
                <Input placeholder="https://youtube.com/..." />
                <Description>URL do YouTube ou Vimeo para o vídeo de apresentação do curso.</Description>
              </TextField>
            </Card.Content>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <FileText className="size-5 text-accent" aria-hidden="true" />
                Publicação
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Select selectedKey={status} onSelectionChange={(k) => setStatus(String(k))} name="status">
                <Label>Status</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {statusOptions.map((opt) => (
                      <ListBoxItem key={opt.id} id={opt.id}>
                        {opt.label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <Select selectedKey={access} onSelectionChange={(k) => setAccess(String(k))} name="access">
                <Label>Acesso</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {acessoOptions.map((opt) => (
                      <ListBoxItem key={opt.id} id={opt.id}>
                        {opt.label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="flex items-center gap-2">
                <Tag className="size-5 text-accent" aria-hidden="true" />
                Categorização
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Select
                selectedKey={category || null}
                onSelectionChange={(k) => setCategory(String(k))}
                name="category"
                placeholder="Selecione uma categoria..."
              >
                <Label>Categoria principal</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {categorias.map((opt) => (
                      <ListBoxItem key={opt.id} id={opt.id}>
                        {opt.label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <TextField name="tags" defaultValue={(course?.tags || []).join(", ")}>
                <Label>Tags (separadas por vírgula)</Label>
                <Input placeholder="Ex.: react, frontend, web" />
              </TextField>
            </Card.Content>
          </Card>
        </div>
      </div>
    </form>
  );
}
