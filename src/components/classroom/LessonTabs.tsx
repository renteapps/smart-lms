"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Label,
  Spinner,
  Tabs,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { Check, Download, FileText, MessageSquare, Save, Send, StickyNote } from "lucide-react";
import { Lesson } from "@/types/course";
import type { StudentNote } from "@/lib/data/notes";
import type { Comment } from "@/lib/data/comments";
import type { User } from "@supabase/supabase-js";
import { saveLessonNote } from "@/app/actions/notes";
import { addLessonComment } from "@/app/actions/comments";
import { NoteIcon } from "@/components/ui/AnimatedIcon";
import BlockViewer from "./BlockViewer";

interface LessonTabsProps {
  lesson: Lesson;
  initialNote?: StudentNote | null;
  initialComments?: Comment[];
  currentUser?: User | null;
}

type TabKey = "overview" | "materials" | "comments" | "notes";

export default function LessonTabs({ 
  lesson, 
  initialNote = null, 
  initialComments = [],
  currentUser = null
}: LessonTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [note, setNote] = useState(initialNote?.content ?? "");
  const [isSaving, startSaving] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, startSubmittingComment] = useTransition();

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
      }
    });
  };

  return (
    <Card className="mt-10 gap-0 overflow-hidden p-0">
      <Tabs.Root
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key) as TabKey)}
      >
        <Tabs.List aria-label="Recursos da aula" className="px-3 sm:px-6">
          <Tabs.Tab id="overview">Visão geral</Tabs.Tab>
          <Tabs.Tab id="materials">Materiais</Tabs.Tab>
          <Tabs.Tab id="comments">Comentários</Tabs.Tab>
          <Tabs.Tab id="notes">
            <StickyNote className="size-4" aria-hidden="true" />
            Anotações
          </Tabs.Tab>
        </Tabs.List>

        {/* --- Visão geral --------------------------------------------------- */}
        <Tabs.Panel id="overview" className="px-5 py-8 sm:px-8 sm:py-10">
          <h2 className="display-3 mb-6 text-foreground">Sobre esta aula</h2>
          {lesson.blocks && lesson.blocks.length > 0 ? (
            <BlockViewer blocks={lesson.blocks} />
          ) : (
            <Typography.Prose className="max-w-[68ch]">
              <p className="text-[1.0625rem] leading-8">
                {lesson.content || "Nenhuma descrição fornecida para esta aula."}
              </p>
            </Typography.Prose>
          )}
        </Tabs.Panel>

        {/* --- Materiais ----------------------------------------------------- */}
        <Tabs.Panel id="materials" className="px-5 py-8 sm:px-8 sm:py-10">
          <h2 className="display-3 mb-6 text-foreground">Materiais complementares</h2>
          {lesson.attachments && lesson.attachments.length > 0 ? (
            <ul className="flex max-w-[68ch] flex-col gap-3">
              {lesson.attachments.map((attachment, idx) => (
                <li key={idx}>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lift group flex min-h-16 items-center justify-between gap-4 rounded-xl border border-hairline bg-surface px-4 py-3 shadow-elev-1"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                        <FileText className="size-4.5" aria-hidden="true" />
                      </span>
                      <span className="truncate text-sm font-semibold text-foreground">{attachment.name}</span>
                    </span>
                    <Download
                      className="size-5 shrink-0 text-muted transition-colors duration-[var(--duration-md)] group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState className="py-10">
              <span className="icon-draw mx-auto grid size-12 place-items-center rounded-xl bg-background-secondary text-muted">
                <NoteIcon size={22} />
              </span>
              <p className="mt-4 text-sm font-semibold text-foreground">Nenhum material anexado</p>
              <p className="mt-1 text-sm text-muted">Esta aula não tem arquivos para baixar.</p>
            </EmptyState>
          )}
        </Tabs.Panel>

        {/* --- Comentários --------------------------------------------------- */}
        <Tabs.Panel id="comments" className="px-5 py-8 sm:px-8 sm:py-10">
          <h2 className="display-3 mb-6 text-foreground">Comentários e dúvidas</h2>

          <div className="flex max-w-[68ch] gap-4">
            <Avatar size="md" color="accent" className="mt-1 shrink-0">
              <Avatar.Fallback>{currentUser?.email?.substring(0, 2).toUpperCase() || "VC"}</Avatar.Fallback>
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

          <ul className="mt-10 flex max-w-[68ch] flex-col gap-6">
            {initialComments.length === 0 ? (
              <li className="text-center text-sm text-muted">Seja o primeiro a comentar!</li>
            ) : (
              initialComments.map((comment) => (
                <li key={comment.id} className="flex gap-4">
                  <Avatar size="md" className="mt-1 shrink-0">
                    {comment.user.avatarUrl ? (
                      <Avatar.Image src={comment.user.avatarUrl} alt={comment.user.name} />
                    ) : (
                      <Avatar.Fallback>{comment.user.name.substring(0, 2).toUpperCase()}</Avatar.Fallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-xl border border-hairline bg-background-secondary p-4">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-foreground">{comment.user.name}</span>
                        <span className="text-xs text-muted">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-muted">
                        {comment.content}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <Button variant="ghost" size="sm">Responder</Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted">
                        <MessageSquare className="size-3.5" aria-hidden="true" />
                        {comment.replies?.length || 0} respostas
                      </Button>
                    </div>
                    
                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <ul className="mt-4 flex flex-col gap-4">
                        {comment.replies.map((reply) => (
                          <li key={reply.id} className="flex gap-4">
                            <Avatar size="sm" className="mt-1 shrink-0">
                              {reply.user.avatarUrl ? (
                                <Avatar.Image src={reply.user.avatarUrl} alt={reply.user.name} />
                              ) : (
                                <Avatar.Fallback>{reply.user.name.substring(0, 2).toUpperCase()}</Avatar.Fallback>
                              )}
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="rounded-xl border border-hairline bg-background-secondary p-4">
                                <div className="mb-1.5 flex items-center justify-between gap-3">
                                  <span className="text-sm font-bold text-foreground">{reply.user.name}</span>
                                  <span className="text-xs text-muted">
                                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-sm leading-6 text-muted">
                                  {reply.content}
                                </p>
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
        <Tabs.Panel id="notes" className="px-5 py-8 sm:px-8 sm:py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display-3 text-foreground">Suas anotações</h2>
              <p className="mt-2 text-sm text-muted">
                Espaço minimalista para seus pensamentos. Suas anotações ficam na sua conta.
              </p>
            </div>
            <Button
              variant={saveSuccess ? "secondary" : "primary"}
              onClick={handleSaveNote}
              isDisabled={isSaving}
              className="gap-2"
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
            <TextArea
              rows={16}
              placeholder="Escreva seus maiores insights sobre a aula aqui..."
              style={{
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, hsl(var(--border)) 31px, hsl(var(--border)) 32px)',
                backgroundAttachment: 'local',
                lineHeight: '32px',
                padding: '8px 16px',
                fontFamily: 'var(--font-mono), monospace',
                backgroundColor: 'hsl(var(--surface))'
              }}
              className="min-h-[400px] resize-y rounded-xl border border-hairline"
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
