"use client";

import { useState, useTransition } from "react";
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
import { Check, Download, FileText, MessageSquare, Save, Send } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlignBoxBottomLeftIcon,
  Comment01Icon,
  Files01Icon,
  Folder01Icon,
} from "@hugeicons/core-free-icons";
import { Lesson } from "@/types/course";
import type { StudentNote } from "@/lib/data/notes";
import type { Comment } from "@/lib/data/comments";
import type { User } from "@supabase/supabase-js";
import { saveLessonNote } from "@/app/actions/notes";
import { addLessonComment } from "@/app/actions/comments";
import BlockViewer from "./BlockViewer";

interface LessonTabsProps {
  lesson: Lesson;
  initialNote?: StudentNote | null;
  initialComments?: Comment[];
  currentUser?: User | null;
}

type TabKey = "overview" | "materials" | "comments" | "notes";

type TabDefinition = {
  id: TabKey;
  label: string;
  icon: typeof AlignBoxBottomLeftIcon;
  badge?: number;
};

/** Classe comum dos painéis: a moldura é do Card, então o painel só cuida do respiro. */
const PANEL_CLASS = "mt-0 px-4 py-7 sm:px-7 sm:py-9 lg:px-9 lg:py-10";

export default function LessonTabs({
  lesson,
  initialNote = null,
  initialComments = [],
  currentUser = null,
}: LessonTabsProps) {
  const [selectedTab, setSelectedTab] = useState<TabKey>("overview");
  const [note, setNote] = useState(initialNote?.content ?? "");
  const [isSaving, startSaving] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, startSubmittingComment] = useTransition();

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
  if (hasOverview) tabs.push({ id: "overview", label: "Visão geral", icon: AlignBoxBottomLeftIcon });
  if (hasMaterials) tabs.push({ id: "materials", label: "Materiais", icon: Folder01Icon });
  tabs.push({ id: "comments", label: "Comentários", icon: Comment01Icon, badge: commentCount });
  tabs.push({ id: "notes", label: "Anotações", icon: Files01Icon });

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
      } else {
        alert(result.message || "Erro ao adicionar comentário");
      }
    });
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
                <HugeiconsIcon
                  icon={tab.icon}
                  size={18}
                  strokeWidth={1.8}
                  className="shrink-0"
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
            <ul className="flex max-w-[68ch] flex-col gap-3">
              {lesson.attachments.map((attachment, idx) => (
                <li key={attachment.id ?? idx}>
                  <a
                    href={attachment.url}
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
        <Tabs.Panel id="comments" className={PANEL_CLASS}>
          <h2 className="display-3 mb-5 text-foreground sm:mb-6">Comentários e dúvidas</h2>

          <div className="flex max-w-[68ch] gap-3 sm:gap-4">
            <Avatar size="md" color="accent" className="mt-1 hidden shrink-0 sm:flex">
              <Avatar.Fallback>
                {currentUser?.email?.substring(0, 2).toUpperCase() || "VC"}
              </Avatar.Fallback>
            </Avatar>
            <div className="relative flex-1">
              <TextField value={newComment} onChange={setNewComment}>
                <Label className="sr-only">Escrever um comentário</Label>
                <TextArea
                  rows={4}
                  placeholder="Adicione um comentário..."
                  className="pr-14"
                  disabled={isSubmittingComment}
                />
              </TextField>
              <Button
                isIconOnly
                variant="primary"
                size="sm"
                aria-label="Enviar comentário"
                className="absolute bottom-3 right-3 rounded-lg"
                onClick={handleSubmitComment}
                isDisabled={isSubmittingComment || !newComment.trim()}
              >
                {isSubmittingComment ? (
                  <Spinner className="size-4" />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          <ul className="mt-8 flex max-w-[68ch] flex-col gap-6 sm:mt-10">
            {initialComments.length === 0 ? (
              <li className="rounded-xl border border-dashed border-hairline-strong px-4 py-8 text-center text-sm text-muted">
                Seja o primeiro a comentar!
              </li>
            ) : (
              initialComments.map((comment) => (
                <li key={comment.id} className="flex gap-3 sm:gap-4">
                  <Avatar size="md" className="mt-1 hidden shrink-0 sm:flex">
                    {comment.user.avatarUrl ? (
                      <Avatar.Image src={comment.user.avatarUrl} alt={comment.user.name} />
                    ) : (
                      <Avatar.Fallback>
                        {comment.user.name.substring(0, 2).toUpperCase()}
                      </Avatar.Fallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-xl border border-hairline bg-background-secondary p-3.5 sm:p-4">
                      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="text-sm font-bold text-foreground">
                          {comment.user.name}
                        </span>
                        <span className="text-xs text-muted">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-muted">{comment.content}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        Responder
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted">
                        <MessageSquare className="size-3.5" aria-hidden="true" />
                        {comment.replies?.length || 0} respostas
                      </Button>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <ul className="mt-4 flex flex-col gap-4 border-l border-hairline pl-3 sm:pl-4">
                        {comment.replies.map((reply) => (
                          <li key={reply.id} className="flex gap-3 sm:gap-4">
                            <Avatar size="sm" className="mt-1 hidden shrink-0 sm:flex">
                              {reply.user.avatarUrl ? (
                                <Avatar.Image src={reply.user.avatarUrl} alt={reply.user.name} />
                              ) : (
                                <Avatar.Fallback>
                                  {reply.user.name.substring(0, 2).toUpperCase()}
                                </Avatar.Fallback>
                              )}
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="rounded-xl border border-hairline bg-background-secondary p-3.5 sm:p-4">
                                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                  <span className="text-sm font-bold text-foreground">
                                    {reply.user.name}
                                  </span>
                                  <span className="text-xs text-muted">
                                    {formatDistanceToNow(new Date(reply.createdAt), {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm leading-6 text-muted">{reply.content}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </Tabs.Panel>

        {/* --- Anotações ----------------------------------------------------- */}
        <Tabs.Panel id="notes" className={PANEL_CLASS}>
          <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="display-3 text-foreground">Suas anotações</h2>
              <p className="mt-2 max-w-[52ch] text-sm text-muted">
                Espaço minimalista para seus pensamentos. Suas anotações ficam na sua conta.
              </p>
            </div>
            <Button
              variant={saveSuccess ? "secondary" : "primary"}
              onClick={handleSaveNote}
              isDisabled={isSaving}
              className="w-full shrink-0 gap-2 sm:w-auto"
            >
              {isSaving ? (
                <Spinner className="size-4" />
              ) : saveSuccess ? (
                <Check className="size-4 text-success" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              {isSaving ? "Salvando..." : saveSuccess ? "Salvo!" : "Salvar anotação"}
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
    </Card>
  );
}
