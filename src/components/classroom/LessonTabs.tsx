"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Avatar,
  Button,
  Card,
  Label,
  Spinner,
  Tabs,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { BookOpen, Check, Download, FileText, Folder, MessageSquare, NotebookPen, Save, Send, Sparkles, Trash, type LucideIcon } from "lucide-react";
import { Lesson } from "@/types/course";
import type { StudentNote } from "@/lib/data/notes";
import type { Comment } from "@/lib/data/comments";
import type { User } from "@supabase/supabase-js";
import { saveLessonNote } from "@/app/actions/notes";
import { addLessonComment, deleteLessonComment } from "@/app/actions/comments";
import BlockViewer from "./BlockViewer";
import { lessonMaterialHref } from "@/lib/lessonMaterials";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/lib/toast";

interface LessonTabsProps {
  lesson: Lesson;
  initialNote?: StudentNote | null;
  initialComments?: Comment[];
  currentUser?: User | null;
  enableComments?: boolean;
}

type TabKey = "overview" | "materials" | "comments" | "notes";

type TabDefinition = {
  id: TabKey;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

/** Classe comum dos painéis: a moldura é do Card, então o painel só cuida do respiro. */
const PANEL_CLASS = "mt-0 px-4 py-7 sm:px-7 sm:py-9 lg:px-9 lg:py-10";

export default function LessonTabs({
  lesson,
  initialNote = null,
  initialComments = [],
  currentUser = null,
  enableComments = true,
}: LessonTabsProps) {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<TabKey>("overview");
  const [note, setNote] = useState(initialNote?.content ?? "");
  const [isSaving, startSaving] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, startSubmittingComment] = useTransition();
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, startSubmittingReply] = useTransition();

  /*
   * Uma aba vazia é ruído: ela promete algo e entrega um estado vazio. Então o
   * conjunto de abas é derivado do que a aula realmente tem. Comentários e
   * anotações são sempre oferecidos — ali quem preenche é o aluno.
   */
  const hasOverview = Boolean(lesson.blocks?.length) || Boolean(lesson.content?.trim());
  const hasMaterials = Boolean(lesson.attachments?.length);
  const commentCount = initialComments.reduce(
    (total, comment) => total + 1 + (comment.replies?.length ?? 0),
    0,
  );

  const tabs: TabDefinition[] = [];
  if (hasOverview) tabs.push({ id: "overview", label: "Visão geral", icon: BookOpen });
  if (hasMaterials) tabs.push({ id: "materials", label: "Materiais", icon: Folder });
  if (enableComments) tabs.push({ id: "comments", label: "Comentários", icon: MessageSquare, badge: commentCount });
  tabs.push({ id: "notes", label: "Anotações", icon: NotebookPen });

  // Ao trocar de aula o conjunto muda; a seleção cai na primeira aba disponível.
  const activeTab = tabs.some((tab) => tab.id === selectedTab) ? selectedTab : tabs[0].id;

  const handleSaveNote = () => {
    setSaveError(null);
    startSaving(async () => {
      const result = await saveLessonNote(lesson.id, lesson.title, note);
      if (result.success) {
        setSaveSuccess(true);
        window.setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.message ?? "Não foi possível salvar.");
      }
    });
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    startSubmittingComment(async () => {
      const result = await addLessonComment(lesson.id, newComment);
      if (result.success) {
        setNewComment("");
        toast.success("Comentário publicado!");
        router.refresh();
      } else {
        toast.danger(result.message || "Erro ao adicionar comentário.");
      }
    });
  };

  const handleToggleReply = (commentId: string) => {
    if (replyingToId === commentId) {
      setReplyingToId(null);
      setReplyContent("");
    } else {
      setReplyingToId(commentId);
      setReplyContent("");
    }
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyContent.trim()) return;

    startSubmittingReply(async () => {
      const result = await addLessonComment(lesson.id, replyContent, parentId);
      if (result.success) {
        setReplyContent("");
        setReplyingToId(null);
        toast.success("Resposta publicada!");
        router.refresh();
      } else {
        toast.danger(result.message || "Erro ao responder comentário.");
      }
    });
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    setIsDeleting(commentToDelete);
    try {
      const result = await deleteLessonComment(commentToDelete);
      if (result.success) {
        toast.success("Comentário removido.");
        setCommentToDelete(null);
        router.refresh();
      } else {
        toast.danger(result.message || "Erro ao apagar comentário.");
      }
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Card className="mt-8 gap-0 overflow-hidden p-0 sm:mt-10">
      <Tabs.Root
        variant="secondary"
        selectedKey={activeTab}
        onSelectionChange={(key) => setSelectedTab(String(key) as TabKey)}
        className="gap-0"
      >
        {/*
          O ListContainer traz o scroller: abaixo de `sm` as quatro abas não
          cabem lado a lado, então a faixa desliza no polegar em vez de quebrar
          em duas linhas.
        */}
        <Tabs.ListContainer className="bg-background-secondary/40 px-2 sm:px-5">
          <Tabs.List aria-label="Recursos da aula">
            {tabs.map((tab) => (
              <Tabs.Tab
                key={tab.id}
                id={tab.id}
                // Sem isto o contador entra no nome acessível como "Comentários2".
                aria-label={tab.badge ? `${tab.label} (${tab.badge})` : undefined}
                className="h-13 w-auto shrink-0 gap-2 px-3 text-sm font-semibold sm:px-4"
              >
                <tab.icon
                  className="size-4.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span
                    aria-hidden="true"
                    className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.6875rem] font-bold text-accent-soft-foreground"
                    data-numeric
                  >
                    {tab.badge}
                  </span>
                ) : null}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {/* --- Visão geral --------------------------------------------------- */}
        {hasOverview && (
          <Tabs.Panel id="overview" className={PANEL_CLASS}>
            <h2 className="display-3 mb-5 text-foreground sm:mb-6">Sobre esta aula</h2>
            {lesson.blocks && lesson.blocks.length > 0 ? (
              <BlockViewer blocks={lesson.blocks} />
            ) : (
              <Typography.Prose className="max-w-[68ch]">
                <p className="text-[1.0625rem] leading-8">{lesson.content}</p>
              </Typography.Prose>
            )}
          </Tabs.Panel>
        )}

        {/* --- Materiais ----------------------------------------------------- */}
        {hasMaterials && (
          <Tabs.Panel id="materials" className={PANEL_CLASS}>
            <h2 className="display-3 mb-5 text-foreground sm:mb-6">Materiais complementares</h2>
            <ul className="flex w-full flex-col gap-3">
              {lesson.attachments.map((attachment, idx) => (
                <li key={attachment.id ?? idx}>
                  <a
                    href={attachment.id ? lessonMaterialHref(attachment.id) : attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lift group flex min-h-16 items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-3 py-3 shadow-elev-1 sm:gap-4 sm:px-4"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                        <FileText className="size-4.5" aria-hidden="true" />
                      </span>
                      <span className="truncate text-sm font-semibold text-foreground">
                        {attachment.name}
                      </span>
                    </span>
                    <Download
                      className="size-5 shrink-0 text-muted transition-colors duration-[var(--duration-md)] group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </Tabs.Panel>
        )}

        {/* --- Comentários --------------------------------------------------- */}
        {enableComments && (
          <Tabs.Panel id="comments" className={PANEL_CLASS}>
            <div className="mb-6 flex flex-col gap-1">
              <h2 className="display-3 text-foreground">Comentários e dúvidas</h2>
              <p className="text-sm text-muted">
                Espaço aberto para compartilhar reflexões, tirar dúvidas e colaborar com a turma.
              </p>
            </div>

            {/* Comment Composer */}
            <div className="flex w-full items-start gap-3 sm:gap-4">
              <Avatar
                size="md"
                color="accent"
                className="mt-1 size-11 shrink-0 aspect-square rounded-full overflow-hidden ring-2 ring-border/80 shadow-sm"
              >
                {currentUser?.user_metadata?.avatar_url ? (
                  <Avatar.Image
                    src={currentUser.user_metadata.avatar_url}
                    alt={currentUser?.user_metadata?.full_name || currentUser?.email || "Você"}
                    className="size-full aspect-square object-cover rounded-full"
                  />
                ) : (
                  <Avatar.Fallback className="font-display text-xs font-bold text-accent-soft-foreground">
                    {currentUser?.user_metadata?.full_name
                      ? currentUser.user_metadata.full_name.substring(0, 2).toUpperCase()
                      : currentUser?.email?.substring(0, 2).toUpperCase() || "VC"}
                  </Avatar.Fallback>
                )}
              </Avatar>

              <div className="min-w-0 flex-1 rounded-2xl border-2 border-border/80 bg-surface shadow-elev-1 transition-all duration-200 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 focus-within:shadow-elev-2">
                <div className="p-3.5 sm:p-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    placeholder="Adicione um comentário, insight ou tire sua dúvida sobre esta aula..."
                    className="w-full resize-y bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted/60 focus:outline-none min-h-[96px] sm:text-base"
                    disabled={isSubmittingComment}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-surface-secondary/40 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-b-2xl">
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
                    <span>Espaço de aprendizado colaborativo</span>
                  </span>

                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-2 rounded-xl px-4 py-2 font-bold shadow-elev-1 hover:shadow-elev-2 transition-all"
                    onClick={handleSubmitComment}
                    isDisabled={isSubmittingComment || !newComment.trim()}
                  >
                    {isSubmittingComment ? (
                      <>
                        <Spinner className="size-3.5" />
                        <span>Publicando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" aria-hidden="true" />
                        <span>Publicar comentário</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Comments Feed */}
            <div className="mt-8 w-full sm:mt-10">
              {initialComments.length === 0 ? (
                <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-surface-secondary/25 px-6 py-12 text-center">
                  <span className="mb-3.5 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent shadow-elev-1">
                    <MessageSquare className="size-6" aria-hidden="true" />
                  </span>
                  <p className="font-display text-base font-bold text-foreground">
                    Nenhum comentário ou dúvida ainda
                  </p>
                  <p className="mt-1.5 max-w-md text-sm text-muted">
                    Seja o primeiro a compartilhar reflexões, fazer perguntas ou contribuir sobre esta aula.
                  </p>
                </div>
              ) : (
                <ul className="flex w-full flex-col gap-6">
                  {initialComments.map((comment) => (
                    <li key={comment.id} className="flex w-full gap-3 sm:gap-4">
                      <Avatar
                        size="md"
                        className="mt-1 size-10 shrink-0 aspect-square rounded-full overflow-hidden ring-2 ring-border/50 shadow-sm"
                      >
                        {comment.user.avatarUrl ? (
                          <Avatar.Image
                            src={comment.user.avatarUrl}
                            alt={comment.user.name}
                            className="size-full aspect-square object-cover rounded-full"
                          />
                        ) : (
                          <Avatar.Fallback className="font-display text-xs font-bold text-accent-soft-foreground">
                            {comment.user.name.substring(0, 2).toUpperCase()}
                          </Avatar.Fallback>
                        )}
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="rounded-2xl border border-border/70 bg-surface p-4 sm:p-5 shadow-elev-1 transition-all hover:border-border">
                          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-sm font-bold text-foreground">
                                {comment.user.name}
                              </span>
                              {comment.status === "pending" && (
                                <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-3xs font-semibold text-warning">
                                  Aguardando aprovação
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted">
                              {formatDistanceToNow(new Date(comment.createdAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 px-1">
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant={replyingToId === comment.id ? "primary" : "ghost"}
                              size="sm"
                              className="gap-1.5 text-xs font-semibold"
                              onClick={() => handleToggleReply(comment.id)}
                            >
                              <MessageSquare className="size-3.5" aria-hidden="true" />
                              {replyingToId === comment.id ? "Cancelar resposta" : "Responder"}
                            </Button>
                            {comment.replies && comment.replies.length > 0 && (
                              <span className="rounded-lg bg-surface-secondary px-2.5 py-1 text-xs font-medium text-muted">
                                {comment.replies.length} {comment.replies.length === 1 ? "resposta" : "respostas"}
                              </span>
                            )}
                          </div>

                          {currentUser?.id === comment.userId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-xs text-danger hover:bg-danger-soft hover:text-danger-soft-foreground"
                              onClick={() => setCommentToDelete(comment.id)}
                              isDisabled={isDeleting === comment.id}
                            >
                              {isDeleting === comment.id ? (
                                <Spinner className="size-3" />
                              ) : (
                                <Trash className="size-3" aria-hidden="true" />
                              )}
                              Excluir
                            </Button>
                          )}
                        </div>

                        {/* Inline Reply Composer */}
                        {replyingToId === comment.id && (
                          <div className="mt-3 flex w-full gap-3 rounded-2xl border-2 border-accent/40 bg-surface p-3.5 sm:p-4 shadow-elev-1">
                            <Avatar
                              size="sm"
                              className="size-8 shrink-0 aspect-square rounded-full overflow-hidden ring-1 ring-border/60"
                            >
                              {currentUser?.user_metadata?.avatar_url ? (
                                <Avatar.Image
                                  src={currentUser.user_metadata.avatar_url}
                                  alt="Você"
                                  className="size-full aspect-square object-cover rounded-full"
                                />
                              ) : (
                                <Avatar.Fallback className="font-display text-3xs font-bold">
                                  {currentUser?.email?.substring(0, 2).toUpperCase() || "VC"}
                                </Avatar.Fallback>
                              )}
                            </Avatar>

                            <div className="min-w-0 flex-1 space-y-2.5">
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                rows={2}
                                placeholder={`Responder para ${comment.user.name}...`}
                                className="w-full resize-y bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted/60 focus:outline-none min-h-[64px]"
                                disabled={isSubmittingReply}
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="tertiary"
                                  size="sm"
                                  onClick={() => {
                                    setReplyingToId(null);
                                    setReplyContent("");
                                  }}
                                  isDisabled={isSubmittingReply}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="gap-1.5 font-bold"
                                  onClick={() => handleSubmitReply(comment.id)}
                                  isDisabled={isSubmittingReply || !replyContent.trim()}
                                >
                                  {isSubmittingReply ? (
                                    <Spinner className="size-3" />
                                  ) : (
                                    <Send className="size-3" aria-hidden="true" />
                                  )}
                                  <span>Responder</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Replies list */}
                        {comment.replies && comment.replies.length > 0 && (
                          <ul className="mt-3.5 space-y-3 border-l-2 border-border/60 pl-3.5 sm:pl-5 ml-3.5 sm:ml-5">
                            {comment.replies.map((reply) => (
                              <li key={reply.id} className="flex gap-3">
                                <Avatar
                                  size="sm"
                                  className="mt-1 size-8 shrink-0 aspect-square rounded-full overflow-hidden ring-1 ring-border/50 shadow-sm"
                                >
                                  {reply.user.avatarUrl ? (
                                    <Avatar.Image
                                      src={reply.user.avatarUrl}
                                      alt={reply.user.name}
                                      className="size-full aspect-square object-cover rounded-full"
                                    />
                                  ) : (
                                    <Avatar.Fallback className="font-display text-3xs font-bold">
                                      {reply.user.name.substring(0, 2).toUpperCase()}
                                    </Avatar.Fallback>
                                  )}
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                  <div className="rounded-xl border border-border/60 bg-surface-secondary/60 p-3 sm:p-3.5">
                                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-display text-xs font-bold text-foreground">
                                          {reply.user.name}
                                        </span>
                                        {reply.status === "pending" && (
                                          <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-3xs font-semibold text-warning">
                                            Aguardando aprovação
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-2xs text-muted">
                                        {formatDistanceToNow(new Date(reply.createdAt), {
                                          addSuffix: true,
                                          locale: ptBR,
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                                      {reply.content}
                                    </p>
                                  </div>

                                  {currentUser?.id === reply.userId && (
                                    <div className="mt-1 flex justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-2xs text-danger hover:bg-danger-soft hover:text-danger-soft-foreground"
                                        onClick={() => setCommentToDelete(reply.id)}
                                        isDisabled={isDeleting === reply.id}
                                      >
                                        {isDeleting === reply.id ? (
                                          <Spinner className="size-3" />
                                        ) : (
                                          <Trash className="size-3" aria-hidden="true" />
                                        )}
                                        Excluir
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Tabs.Panel>
        )}

          {/* Anotações */}
          <Tabs.Panel id="notes" className={PANEL_CLASS}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display font-bold text-foreground">Suas anotações</p>
                <p className="text-xs text-muted">Privadas — só você vê o que escrever aqui.</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveNote}
                isDisabled={isSaving}
                className="self-start sm:self-auto"
              >
                {isSaving ? (
                  <Spinner className="size-3.5" />
                ) : saveSuccess ? (
                  <Check className="size-3.5 text-success" aria-hidden="true" />
                ) : (
                  <Save className="size-3.5" aria-hidden="true" />
                )}
                <span>{saveSuccess ? "Salvo!" : "Salvar anotações"}</span>
              </Button>
            </div>

            <TextField value={note} onChange={setNote}>
              <Label className="sr-only">Anotações desta aula</Label>
              {/*
                Papel pautado: a linha acompanha o `line-height`, e `background-attachment:
                local` faz o pautado rolar junto com o texto em vez de ficar parado no campo.
              */}
              <TextArea
                rows={14}
                placeholder="Escreva seus maiores insights sobre a aula aqui..."
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(transparent, transparent 31px, var(--hairline) 31px, var(--hairline) 32px)",
                  backgroundAttachment: "local",
                  backgroundColor: "var(--surface)",
                  lineHeight: "32px",
                  padding: "8px 16px",
                  fontFamily: "var(--font-mono), monospace",
                }}
                className="min-h-[18rem] resize-y rounded-xl border border-hairline sm:min-h-[25rem]"
              />
            </TextField>

            {saveError && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {saveError}
              </p>
            )}
          </Tabs.Panel>
        </Tabs.Root>

        <ConfirmDialog
          isOpen={Boolean(commentToDelete)}
          onOpenChange={(open) => {
            if (!open) setCommentToDelete(null);
          }}
          title="Apagar comentário"
          description="Tem certeza que deseja apagar este comentário? Esta ação não pode ser desfeita."
          confirmText="Apagar"
          cancelText="Cancelar"
          variant="danger"
          isLoading={Boolean(isDeleting)}
          onConfirm={confirmDeleteComment}
        />
      </Card>
    );
}
