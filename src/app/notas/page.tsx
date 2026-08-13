"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { Button, buttonVariants, Card, EmptyState, Label, SearchField, Skeleton } from "@heroui/react";
import { NoteIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { Rise } from "@/components/ui/Rise";
import { isAgentNote } from "@/lib/agentNotes";

interface Note {
  lessonId: string;
  lessonTitle: string;
  content: string;
  updatedAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export default function NotasPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  /*
   * Sem requestAnimationFrame: rAF não dispara em aba oculta, e a página
   * ficaria presa no esqueleto até receber foco. Ler o localStorage é barato
   * o bastante para acontecer no próprio efeito.
   */
  useEffect(() => {
    const savedNotes = localStorage.getItem("smartlms_all_notes");
    if (savedNotes) {
      try {
        const parsed: unknown = JSON.parse(savedNotes);
        if (Array.isArray(parsed)) setNotes(parsed as Note[]);
      } catch {
        // Ignora dados locais corrompidos sem bloquear a página.
      }
    }
    setIsLoaded(true);
  }, []);

  const handleDelete = (lessonId: string) => {
    const newNotes = notes.filter((note) => note.lessonId !== lessonId);
    setNotes(newNotes);
    localStorage.setItem("smartlms_all_notes", JSON.stringify(newNotes));
    localStorage.removeItem(`smartlms_note_${lessonId}`);
  };

  const filteredNotes = useMemo(() => {
    const normalized = searchQuery.toLocaleLowerCase("pt-BR");
    return notes.filter((note) => note.content.toLocaleLowerCase("pt-BR").includes(normalized) || note.lessonTitle.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [notes, searchQuery]);

  return (
    <div className="pt-[76px]">
      <section className="border-b border-hairline">
        <div className="editorial-container grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end">
          <Rise>
            <p className="eyebrow">Caderno pessoal</p>
            <h1 className="display-1 mt-3 max-w-3xl text-foreground">Ideias que merecem continuar com você.</h1>
            <p className="lede mt-6">
              Releia seus insights e transforme anotações em pequenas ações para a rotina.
            </p>
          </Rise>

          {isLoaded && notes.length > 0 && (
            <SearchField value={searchQuery} onChange={setSearchQuery} className="w-full lg:w-80">
              <Label className="sr-only">Buscar nas anotações</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Buscar nas anotações" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          )}
        </div>
      </section>

      <section className="editorial-container py-10 sm:py-14">
        {!isLoaded ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Carregando suas anotações" aria-busy="true">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="gap-4">
                <Card.Content className="gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-11 w-full" />
                </Card.Content>
              </Card>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState className="gap-5 py-24">
            <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <NoteIcon size={28} />
            </span>
            <div className="max-w-md text-center">
              <p className="display-3 text-foreground">Seu caderno ainda está em branco</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Durante uma aula, abra a aba “Anotações” para registrar ideias, perguntas e decisões.
              </p>
            </div>
            <Link href="/cursos" className={buttonVariants({ variant: "primary" })}>
              Escolher uma aula <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </EmptyState>
        ) : filteredNotes.length === 0 ? (
          <EmptyState className="gap-5 py-24">
            <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-default text-default-foreground">
              <NoteIcon size={28} />
            </span>
            <div className="max-w-md text-center">
              <p className="display-3 text-foreground">Nada encontrado</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Nenhuma anotação corresponde a “{searchQuery}”. Tente buscar por outro termo.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setSearchQuery("")}>
              Limpar busca
            </Button>
          </EmptyState>
        ) : (
          <>
            <p className="mb-7 text-sm text-muted" aria-live="polite" data-numeric>
              <strong className="font-bold text-foreground">{filteredNotes.length}</strong>{" "}
              {filteredNotes.length === 1 ? "anotação" : "anotações"}
            </p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note, index) => (
                <Rise key={note.lessonId} className="min-w-0" delay={Math.min(index, 5) * 60}>
                  <Reveal className="h-full rounded-2xl">
                    <Card className="group h-full min-h-72 border-hairline">
                      <Card.Header className="flex-row items-start justify-between gap-3">
                        <time
                          dateTime={note.updatedAt}
                          className="eyebrow pt-1.5 normal-case tracking-[0.06em]"
                        >
                          {dateFormatter.format(new Date(note.updatedAt))}
                        </time>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          aria-label={`Excluir anotação de ${note.lessonTitle}`}
                          onClick={() => handleDelete(note.lessonId)}
                          className="shrink-0 text-muted opacity-100 transition-opacity hover:text-danger md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </Card.Header>

                      <Card.Content className="gap-3">
                        <h2 className="font-display text-lg font-extrabold leading-snug tracking-[-0.02em] text-foreground">
                          {note.lessonTitle}
                        </h2>
                        <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-muted">{note.content}</p>
                      </Card.Content>

                      <Card.Footer className="mt-auto">
                        {/* Anotação vinda de uma conversa não tem aula para reabrir. */}
                        <Link
                          href={isAgentNote(note.lessonId) ? "/agentes" : `/courses/c1/lessons/${note.lessonId}`}
                          className={buttonVariants({ variant: "secondary", fullWidth: true })}
                        >
                          {isAgentNote(note.lessonId) ? "Voltar aos agentes" : "Reabrir aula"}{" "}
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </Link>
                      </Card.Footer>
                    </Card>
                  </Reveal>
                </Rise>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
