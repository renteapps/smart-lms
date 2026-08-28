"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Filter, Globe, Lock, MessageSquare, Send, Trash2, UserX } from "lucide-react";
import {
  AlertDialog,
  Button,
  Card,
  EmptyState,
  Label,
  Modal,
  SearchField,
  Table,
  TextArea,
  toast,
} from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { useNotifications } from "@/contexts/NotificationContext";
import { createClient } from "@/lib/supabase/client";

type CommentType = {
  id: string;
  lessonId: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  lessonName: string;
  content: string;
  timeAgo: string;
  status: "Aguardando" | "Respondido";
  dbStatus: string;
};

const filters = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Aguardando resposta" },
] as const;

export default function AdminComentarios() {
  const [selectedComment, setSelectedComment] = useState<CommentType | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyVisibility, setReplyVisibility] = useState<"public" | "private">("public");
  const { addNotification } = useNotifications();

  const [comments, setComments] = useState<CommentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  const loadComments = async () => {
    setIsLoading(true);
    const supabase = createClient();
    try {
      // A consulta é intencionalmente plana. O embed aninhado do PostgREST
      // depende de todas as FKs estarem presentes no schema cache; se uma
      // migração estiver pendente, ele impede até a lista de comentários de
      // carregar. As relações são montadas abaixo a partir das chaves reais.
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          lesson_id,
          user_id,
          status
        `)
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data?.length) {
        setComments([]);
        return;
      }

      const userIds = [...new Set(data.map((comment) => comment.user_id).filter(Boolean))];
      const lessonIds = [...new Set(data.map((comment) => comment.lesson_id).filter(Boolean))];
      const [profilesResult, lessonsResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", userIds),
        supabase.from("lessons").select("id, title, module_id").in("id", lessonIds),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (lessonsResult.error) throw lessonsResult.error;

      const moduleIds = [...new Set((lessonsResult.data ?? []).map((lesson) => lesson.module_id).filter(Boolean))];
      const { data: modules, error: modulesError } = moduleIds.length
        ? await supabase.from("modules").select("id, course_id").in("id", moduleIds)
        : { data: [], error: null };

      if (modulesError) throw modulesError;

      const courseIds = [...new Set((modules ?? []).map((module) => module.course_id).filter(Boolean))];
      const { data: courses, error: coursesError } = courseIds.length
        ? await supabase.from("courses").select("id, title").in("id", courseIds)
        : { data: [], error: null };

      if (coursesError) throw coursesError;

      const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
      const lessonsById = new Map((lessonsResult.data ?? []).map((lesson) => [lesson.id, lesson]));
      const modulesById = new Map((modules ?? []).map((module) => [module.id, module]));
      const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));

      // Buscar se há respostas (para definir status)
      const { data: replies, error: repliesError } = await supabase
        .from("comments")
        .select("parent_id")
        .not("parent_id", "is", null);

      if (repliesError) throw repliesError;

      const repliedIds = new Set(replies?.map(r => r.parent_id));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = (data ?? []).map((row: any) => {
        const student = profilesById.get(row.user_id);
        const lesson = lessonsById.get(row.lesson_id);
        const lessonModule = lesson ? modulesById.get(lesson.module_id) : undefined;
        const course = lessonModule ? coursesById.get(lessonModule.course_id) : undefined;

        return {
          id: row.id,
          lessonId: row.lesson_id,
          studentName: student?.full_name || "Desconhecido",
          studentEmail: student?.email || "N/A",
          courseName: course?.title || "Curso Desconhecido",
          lessonName: lesson?.title || "Aula Desconhecida",
          content: row.content,
          timeAgo: new Date(row.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' }),
          status: repliedIds.has(row.id) ? "Respondido" : "Aguardando",
          dbStatus: row.status || "pending",
        } as CommentType;
      });

      setComments(formatted);
    } catch (err) {
      console.error(err);
      toast.danger("Erro ao carregar comentários.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadComments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedComment) return;

    const supabase = createClient();
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const newStatus = replyVisibility === "public" ? "published" : "pending";

      // If public, we should also publish the parent comment
      if (replyVisibility === "public") {
        await supabase
          .from("comments")
          .update({ status: "published" })
          .eq("id", selectedComment.id);
      }

      const { error } = await supabase.from("comments").insert({
        content: replyText,
        parent_id: selectedComment.id,
        lesson_id: selectedComment.lessonId,
        user_id: userData.user.id,
        status: newStatus
      });

      if (error) throw error;

      addNotification({
        title: "Sua dúvida foi respondida!",
        message: `O professor respondeu seu comentário na aula: ${selectedComment.lessonName}.`,
        targetAudience: "user",
        targetId: selectedComment.studentEmail,
        channels: ["platform"],
      });

      toast.success("Resposta enviada e aluno notificado!");
      setSelectedComment(null);
      setReplyText("");
      loadComments();
    } catch (err) {
      console.error(err);
      toast.danger("Erro ao enviar resposta.");
    }
  };

  const filtered = comments
    .filter((c) => filter === "all" || c.status === "Aguardando")
    .filter((c) =>
      !search.trim() ||
      c.studentName.toLowerCase().includes(search.toLowerCase()) ||
      c.content.toLowerCase().includes(search.toLowerCase()) ||
      c.courseName.toLowerCase().includes(search.toLowerCase()),
    );

  const isEmpty = !isLoading && filtered.length === 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Pessoas"
        title="Comentários"
        description="Gerencie e responda às dúvidas dos alunos em todos os cursos."
        actions={
          <Button variant="outline" size="md" className="gap-2">
            <Filter className="size-4" aria-hidden="true" />
            Filtrar
          </Button>
        }
      />

      <Card>
        <Card.Header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            {filters.map((f) => (
              <Button
                key={f.id}
                variant={filter === f.id ? "primary" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <SearchField value={search} onChange={setSearch} className="w-full md:w-72" aria-label="Buscar comentário">
            <Label className="sr-only">Buscar comentário</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Buscar comentário..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </Card.Header>

        <Card.Content className="px-0 pb-0">
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-muted">Carregando comentários...</div>
          ) : isEmpty ? (
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <MessageSquare className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">Nenhum comentário encontrado</p>
              <p className="text-sm text-muted">Ajuste os filtros ou a busca para ver outros comentários.</p>
            </EmptyState>
          ) : (
            <>
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Comentários dos alunos">
                      <Table.Header>
                        <Table.Column isRowHeader>Aluno</Table.Column>
                        <Table.Column>Curso / Aula</Table.Column>
                        <Table.Column>Comentário</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column><span className="sr-only">Ações</span></Table.Column>
                      </Table.Header>
                      <Table.Body items={filtered}>
                        {(comment) => (
                          <Table.Row id={comment.id} onAction={() => setSelectedComment(comment)}>
                            <Table.Cell>
                              <div className="font-semibold text-foreground">{comment.studentName}</div>
                              <div className="text-xs text-muted">{comment.studentEmail}</div>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="text-sm font-medium text-foreground">{comment.courseName}</div>
                              <div className="text-xs text-muted">{comment.lessonName}</div>
                            </Table.Cell>
                            <Table.Cell>
                              <p className="line-clamp-2 max-w-sm text-sm text-muted">{comment.content}</p>
                              <div className="mt-1 text-xs text-muted">{comment.timeAgo}</div>
                            </Table.Cell>
                            <Table.Cell>
                              <StatusBadge tone={comment.status === "Aguardando" ? "warning" : "positive"}>
                                {comment.status}
                              </StatusBadge>
                            </Table.Cell>
                            <Table.Cell>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedComment(comment)}>
                                {comment.status === "Aguardando" ? "Responder" : "Ver"}
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              <ul className="divide-y divide-separator md:hidden">
                {filtered.map((comment) => (
                  <li key={comment.id} className="p-4" onClick={() => setSelectedComment(comment)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-foreground">{comment.studentName}</p>
                        <p className="text-xs text-muted">{comment.studentEmail}</p>
                      </div>
                      <StatusBadge tone={comment.status === "Aguardando" ? "warning" : "positive"}>
                        {comment.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-3 text-xs font-bold text-accent">{comment.courseName}</p>
                    <p className="mt-1 text-xs text-muted">{comment.lessonName}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{comment.content}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted">{comment.timeAgo}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedComment(comment);
                        }}
                      >
                        {comment.status === "Aguardando" ? "Responder" : "Ver"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>

      <Modal.Root isOpen={!!selectedComment} onOpenChange={(open) => !open && setSelectedComment(null)}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              {selectedComment && (
                <>
                  <Modal.Header className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-xl font-bold text-foreground">{selectedComment.courseName}</p>
                      <p className="text-sm font-semibold text-accent">{selectedComment.lessonName}</p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge tone={selectedComment.dbStatus === "pending" ? "warning" : "positive"}>
                        {selectedComment.dbStatus === "pending" ? "Oculto" : "Público"}
                      </StatusBadge>
                      <StatusBadge tone={selectedComment.status === "Aguardando" ? "warning" : "positive"}>
                        {selectedComment.status}
                      </StatusBadge>
                    </div>
                  </Modal.Header>

                  <Modal.Body className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent-soft-foreground">
                        {selectedComment.studentName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-foreground">{selectedComment.studentName}</span>
                          <span className="text-xs text-muted">{selectedComment.timeAgo}</span>
                        </div>
                        <p className="mb-1 text-sm text-muted">{selectedComment.studentEmail}</p>
                        <div className="mt-3 rounded-xl border border-border bg-background-secondary p-4 text-foreground">
                          {selectedComment.content}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant={replyVisibility === "public" ? "primary" : "outline"}
                          size="sm"
                          className="gap-2"
                          onClick={() => setReplyVisibility("public")}
                        >
                          <Globe className="size-4" aria-hidden="true" />
                          Visível para todos
                        </Button>
                        <Button
                          variant={replyVisibility === "private" ? "primary" : "outline"}
                          size="sm"
                          className="gap-2"
                          onClick={() => setReplyVisibility("private")}
                        >
                          <Lock className="size-4" aria-hidden="true" />
                          Só para o aluno
                        </Button>
                      </div>

                      <TextArea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escreva sua resposta aqui..."
                        rows={5}
                        className="resize-none"
                      />
                    </div>
                  </Modal.Body>

                  <Modal.Footer className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        aria-label="Excluir comentário"
                        className="text-danger hover:bg-danger-soft hover:text-danger-soft-foreground"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        aria-label="Bloquear aluno"
                        className="text-danger hover:bg-danger-soft hover:text-danger-soft-foreground"
                        onClick={() => setConfirmBlock(true)}
                      >
                        <UserX className="size-4" aria-hidden="true" />
                      </Button>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="tertiary" onClick={() => setSelectedComment(null)}>
                        Cancelar
                      </Button>
                      {selectedComment.dbStatus === "pending" && (
                        <Button 
                          variant="secondary" 
                          className="gap-2" 
                          onClick={async () => {
                            const supabase = createClient();
                            await supabase
                              .from("comments")
                              .update({ status: "published" })
                              .eq("id", selectedComment.id);
                            toast.success("Comentário aprovado!");
                            setSelectedComment(null);
                            loadComments();
                          }}
                        >
                          <Globe className="size-4" aria-hidden="true" />
                          Aprovar (Tornar Público)
                        </Button>
                      )}
                      <Button variant="primary" className="gap-2" onClick={handleSendReply}>
                        <Send className="size-4" aria-hidden="true" />
                        Enviar resposta
                      </Button>
                    </div>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      <AlertDialog.Root isOpen={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="md">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Excluir comentário?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>Tem certeza de que deseja excluir permanentemente este comentário? Esta ação não pode ser desfeita.</p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (selectedComment) {
                      const supabase = createClient();
                      await supabase.from("comments").delete().eq("id", selectedComment.id);
                      toast.success("Comentário excluído.");
                      loadComments();
                    }
                    setConfirmDelete(false);
                    setSelectedComment(null);
                  }}
                >
                  Excluir comentário
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog.Root>

      <AlertDialog.Root isOpen={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="md">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Bloquear aluno?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>Tem certeza de que deseja bloquear este aluno de comentar? Ele não poderá mais enviar dúvidas nos cursos.</p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" onClick={() => setConfirmBlock(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={() => setConfirmBlock(false)}>
                  Bloquear aluno
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog.Root>
    </div>
  );
}
