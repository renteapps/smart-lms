"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, Search, StickyNote, Trash2 } from "lucide-react";

interface Note {
  lessonId: string;
  lessonTitle: string;
  content: string;
  updatedAt: string;
}

export default function NotasPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
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
    });
    return () => cancelAnimationFrame(frame);
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
      <section className="border-b border-border bg-accent-sage/8">
        <div className="editorial-container grid gap-8 py-14 sm:py-18 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-sage/15 px-3 py-1.5 text-xs font-bold text-positive"><StickyNote className="h-3.5 w-3.5" /> Caderno pessoal</div><h1 className="max-w-3xl text-4xl font-extrabold tracking-[-0.05em] text-ink sm:text-6xl">Ideias que merecem continuar com você.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-text-soft">Releia seus insights e transforme anotações em pequenas ações para a rotina.</p></div>
          <label className="relative block w-full lg:w-80"><span className="sr-only">Buscar nas anotações</span><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-mute" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar nas anotações" className="h-12 w-full rounded-[13px] border border-border bg-surface pl-12 pr-4 text-sm shadow-sm focus:border-primary focus:outline-none" /></label>
        </div>
      </section>

      <section className="editorial-container py-10 sm:py-14">
        {!isLoaded ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-[10px] border border-border bg-surface" />)}</div>
        ) : notes.length === 0 ? (
          <div className="editorial-card flex flex-col items-center justify-center px-6 py-20 text-center"><span className="grid h-16 w-16 place-items-center rounded-[20px] bg-primary-pale text-primary"><FileText className="h-7 w-7" /></span><h2 className="mt-6 text-2xl font-extrabold text-ink">Seu caderno ainda está em branco</h2><p className="mt-3 max-w-md leading-7 text-text-soft">Durante uma aula, abra a aba “Anotações” para registrar ideias, perguntas e decisões.</p><Link href="/cursos" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-[13px] bg-primary px-5 font-bold text-on-primary hover:bg-primary-active">Escolher uma aula <ArrowUpRight className="h-4 w-4" /></Link></div>
        ) : filteredNotes.length === 0 ? (
          <div className="editorial-card py-16 text-center"><h2 className="text-xl font-extrabold text-ink">Nada encontrado</h2><p className="mt-2 text-text-soft">Tente buscar por outro termo.</p></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => (
              <article key={note.lessonId} className="editorial-card editorial-card-interactive group flex min-h-72 flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4"><span className="text-xs font-bold uppercase tracking-[0.08em] text-text-mute">{new Date(note.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span><button onClick={() => handleDelete(note.lessonId)} aria-label={`Excluir anotação de ${note.lessonTitle}`} className="grid h-10 w-10 place-items-center rounded-[10px] text-text-mute opacity-100 hover:bg-negative/10 hover:text-negative md:opacity-0 md:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></div>
                <h2 className="mt-3 text-lg font-extrabold leading-snug text-ink">{note.lessonTitle}</h2>
                <p className="mt-4 line-clamp-6 flex-1 whitespace-pre-wrap text-sm leading-6 text-text-soft">{note.content}</p>
                <Link href={`/courses/c1/lessons/${note.lessonId}`} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[11px] bg-canvas-soft px-4 text-sm font-bold text-ink hover:bg-primary-pale hover:text-primary-active">Reabrir aula <ArrowUpRight className="h-4 w-4" /></Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
