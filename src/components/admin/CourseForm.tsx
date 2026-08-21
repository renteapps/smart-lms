"use client";

import Link from "next/link";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Save,
  Tag as TagIcon,
  Type,
} from "lucide-react";
import {
  AlertDialog,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
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
import type { Course, CourseStatus } from "@/types/course";
import type { CategoryRow, TagRow } from "@/app/actions/admin/categories";

const statusOptions: Array<{ id: CourseStatus; label: string }> = [
  { id: "Rascunho", label: "Rascunho" },
  { id: "Publicado", label: "Publicado" },
  { id: "Arquivado", label: "Arquivado" },
];

const acessoOptions = [
  { id: "Gratuito", label: "Gratuito" },
  { id: "Pago", label: "Pago" },
  { id: "Assinantes", label: "Somente assinantes" },
];

export function CourseForm({ 
  course, 
  categories = [], 
  tagsOptions = [] 
}: { 
  course?: Course;
  categories?: CategoryRow[];
  tagsOptions?: TagRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [coverUrl, setCoverUrl] = useState(course?.coverUrl || "");
  
  const initialStatus: CourseStatus =
    (course?.status as CourseStatus) ||
    (course?.isPublished ? "Publicado" : "Rascunho");

  const [status, setStatus] = useState<CourseStatus>(initialStatus);
  const [pendingStatus, setPendingStatus] = useState<CourseStatus | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [access, setAccess] = useState("Pago");
  const [category, setCategory] = useState(course?.category || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(course?.tags || []);

  const isEditing = Boolean(course);
  const backHref = isEditing ? `/admin/cursos/${course!.id}` : "/admin/cursos";

  const availableCategories = useMemo(() => {
    const list = [...(categories || [])];
    if (course?.category && !list.some((c) => c.name === course.category)) {
      list.unshift({ id: "current-course-cat", name: course.category, slug: course.category, created_at: "" });
    }
    return list;
  }, [categories, course]);

  const availableTags = useMemo(() => {
    const list = [...(tagsOptions || [])];
    if (course?.tags) {
      for (const t of course.tags) {
        if (!list.some((opt) => opt.name === t)) {
          list.push({ id: `tag-${t}`, name: t, slug: t, created_at: "" });
        }
      }
    }
    return list;
  }, [tagsOptions, course]);

  const handleStatusChange = (newKey: string) => {
    const nextStatus = newKey as CourseStatus;
    if (nextStatus === status) return;

    if (isEditing) {
      setPendingStatus(nextStatus);
      setIsConfirmOpen(true);
    } else {
      setStatus(nextStatus);
    }
  };

  const handleConfirmStatusChange = () => {
    if (pendingStatus) {
      setStatus(pendingStatus);
    }
    setIsConfirmOpen(false);
    setPendingStatus(null);
  };

  const handleCancelStatusChange = () => {
    setIsConfirmOpen(false);
    setPendingStatus(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const title = formData.get("title") as string;

    startTransition(async () => {
      const instructorNamesRaw = formData.get("instructorNames") as string;
      const instructorNames = instructorNamesRaw
        ? instructorNamesRaw.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      const res = await saveCourse({
        id: course?.id,
        title,
        shortDescription: formData.get("shortDescription") as string,
        description: formData.get("description") as string,
        coverUrl: coverUrl,
        category: category || "Geral",
        status: status,
        isPublished: status === "Publicado",
        tags: selectedTags,
        instructorNames,
      });

      if (res.success) {
        toast.success(isEditing ? "Curso atualizado" : "Curso criado");
        // Sem id não dá para abrir o painel do curso: navegar assim montaria
        // `/admin/cursos/undefined`, que a rota resolve como 404 e faz parecer
        // que o curso não foi criado — quando ele foi. Volta para a lista.
        const targetId = isEditing ? course!.id : res.data?.id;
        router.push(targetId ? `/admin/cursos/${targetId}` : "/admin/cursos");
        router.refresh();
      } else {
        toast.danger("Não foi possível salvar o curso", { description: res.message });
      }
    });
  };

  return (
    <>
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
                <TextField name="instructorNames" defaultValue={course?.instructorNames?.join(", ") || ""}>
                  <Label>Instrutor(es)</Label>
                  <Input placeholder="Ex.: Maria Silva, João Santos" />
                  <Description>Separe múltiplos instrutores por vírgula. Aparecerá no curso e certificado.</Description>
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
                <Select
                  selectedKey={status}
                  onSelectionChange={(k) => handleStatusChange(String(k))}
                  name="status"
                >
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
                  <TagIcon className="size-5 text-accent" aria-hidden="true" />
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
                      {availableCategories.map((opt) => (
                        <ListBoxItem key={opt.name} id={opt.name}>
                          {opt.name}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <div>
                  <Label className="mb-2 block">Tags</Label>
                  {availableTags.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface p-3">
                      <CheckboxGroup 
                        value={selectedTags} 
                        onChange={(values) => setSelectedTags(values as string[])}
                      >
                        {availableTags.map(tag => (
                          <Checkbox key={tag.name} value={tag.name}>
                            {tag.name}
                          </Checkbox>
                        ))}
                      </CheckboxGroup>
                    </div>
                  ) : (
                    <p className="text-sm text-muted italic">Nenhuma tag cadastrada.</p>
                  )}
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog for Status Change */}
      <AlertDialog.Root
        isOpen={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelStatusChange();
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="md">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status={pendingStatus === "Arquivado" ? "danger" : "warning"}>
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Alterar status do curso?</AlertDialog.Heading>
              </AlertDialog.Header>

              <AlertDialog.Body>
                <p>
                  Deseja realmente alterar o status deste curso de{" "}
                  <strong className="font-semibold text-foreground">{status}</strong> para{" "}
                  <strong className="font-semibold text-foreground">{pendingStatus}</strong>?
                </p>

                <div className="mt-4 rounded-lg border border-border bg-background-secondary p-4 text-sm text-muted">
                  {pendingStatus === "Arquivado" && (
                    <p>
                      Cursos com status arquivado ficarão <strong>ocultos para todos os alunos</strong> e não
                      aparecerão na listagem padrão do painel administrativo (ficando visíveis apenas ao tocar no botão de arquivados).
                    </p>
                  )}
                  {pendingStatus === "Rascunho" && (
                    <p>
                      Cursos em rascunho ficam <strong>ocultos para os alunos</strong> no catálogo de aprendizagem até que sejam publicados.
                    </p>
                  )}
                  {pendingStatus === "Publicado" && (
                    <p>
                      O curso ficará <strong>visível para os alunos</strong> no catálogo de cursos da plataforma.
                    </p>
                  )}
                </div>
              </AlertDialog.Body>

              <AlertDialog.Footer>
                <Button variant="tertiary" onClick={handleCancelStatusChange}>
                  Cancelar
                </Button>
                <Button
                  variant={pendingStatus === "Arquivado" ? "danger" : "primary"}
                  onClick={handleConfirmStatusChange}
                >
                  Confirmar alteração
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog.Root>
    </>
  );
}
