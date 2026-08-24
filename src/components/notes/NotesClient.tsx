"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Calendar,
  Check,
  Copy,
  Download,
  Edit3,
  FileText,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  buttonVariants,
  Card,
  Chip,
  Modal,
  SearchField,
  Skeleton,
  toast,
} from "@heroui/react";
import { NoteIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { Rise } from "@/components/ui/Rise";
import {
  exportNotesAsMarkdown,
  isAgentNote,
  isLessonNote,
  isPersonalNote,
  type StudentNote,
} from "@/lib/data/notes";
import {
  deleteNote,
  savePersonalNote,
  togglePinNote,
  updateNote,
} from "@/app/actions/notes";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatRelativeDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `Há ${minutes} min`;
    }
    if (diffHours < 24) {
      return `Hoje às ${timeFormatter.format(date)}`;
    }
    if (diffDays === 1) {
      return `Ontem às ${timeFormatter.format(date)}`;
    }
    if (diffDays < 7) {
      return `Há ${diffDays} dias`;
    }
    return dateFormatter.format(date);
  } catch {
    return isoDate;
  }
}

type CategoryFilter = "todas" | "aulas" | "agentes" | "pessoal" | "fixadas";
type SortOption = "recent" | "oldest" | "title";

export default function NotesClient({ initialNotes }: { initialNotes: StudentNote[] }) {
  const [notes, setNotes] = useState<StudentNote[]>(initialNotes);
  const [syncedFrom, setSyncedFrom] = useState<StudentNote[]>(initialNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("todas");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const isLoaded = true;

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<StudentNote | null>(null);

  // Estados dos formulários
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null);
  const [viewingNote, setViewingNote] = useState<StudentNote | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formPinned, setFormPinned] = useState(false);

  // Feedback de cópia
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, startMutation] = useTransition();

  /*
   * A lista chega pronta do servidor; `router.refresh()` relê do Supabase depois
   * de cada mutação, então não há um segundo espelho do caderno no cliente.
   */
  const router = useRouter();

  /*
   * Ajuste durante o render em vez de efeito: a lista recarregada do servidor
   * substitui o estado otimista sem disparar renderização em cascata.
   */
  if (syncedFrom !== initialNotes) {
    setSyncedFrom(initialNotes);
    setNotes(initialNotes);
  }

  /*
   * `?nota=<id>` abre a anotação direto — é assim que um resultado da busca
   * (`/busca`) chega até a nota específica em vez de largar a pessoa na lista
   * inteira. O parâmetro sai da URL depois de aberto para não reabrir o modal
   * a cada `router.refresh()`.
   */
  const searchParams = useSearchParams();
  const requestedNoteId = searchParams.get("nota");
  const [openedFromUrl, setOpenedFromUrl] = useState<string | null>(null);

  // Mesmo padrão de ajuste-durante-o-render usado logo acima para `syncedFrom`:
  // abrir o modal por efeito faria a lista renderizar fechada primeiro e só
  // então abrir, com um piscar visível.
  if (requestedNoteId && requestedNoteId !== openedFromUrl) {
    setOpenedFromUrl(requestedNoteId);
    const target = notes.find((note) => note.id === requestedNoteId);
    if (target) {
      setViewingNote(target);
      setIsViewModalOpen(true);
    }
  }

  // Limpar a URL é atualização de sistema externo — aí sim, efeito.
  useEffect(() => {
    if (!requestedNoteId) return;
    router.replace("/notas", { scroll: false });
  }, [requestedNoteId, router]);

  const refreshNotes = () => router.refresh();

  // Exclusão
  const handleDeleteConfirm = () => {
    if (!deleteConfirmNote) return;
    const target = deleteConfirmNote;
    setNotes((current) => current.filter((note) => note.id !== target.id));
    setDeleteConfirmNote(null);

    startMutation(async () => {
      const result = await deleteNote(target.id);
      if (result.success) {
        toast.success("Anotação excluída com sucesso.");
        refreshNotes();
      } else {
        toast.danger(result.message ?? "Não foi possível excluir.");
        refreshNotes();
      }
    });
  };

  // Fixar / Desafixar
  const handleTogglePin = (noteId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes((current) =>
      current.map((note) => (note.id === noteId ? { ...note, pinned: !note.pinned } : note)),
    );

    startMutation(async () => {
      const result = await togglePinNote(noteId);
      if (result.success) {
        toast.info("Status de fixação atualizado.");
        refreshNotes();
      } else {
        toast.danger(result.message ?? "Não foi possível fixar a anotação.");
        refreshNotes();
      }
    });
  };

  // Copiar conteúdo para a área de transferência
  const handleCopyContent = async (note: StudentNote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
      setCopiedId(note.id);
      toast.success("Anotação copiada para a área de transferência!");
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast.danger("Não foi possível copiar o texto.");
    }
  };

  // Abrir modal de criação
  const handleOpenCreateModal = () => {
    setFormTitle("");
    setFormContent("");
    setFormTags("");
    setFormPinned(false);
    setIsCreateModalOpen(true);
  };

  // Salvar nova anotação
  const handleSaveNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) {
      toast.danger("O conteúdo da anotação não pode ficar vazio.");
      return;
    }

    const tags = formTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    setIsCreateModalOpen(false);

    startMutation(async () => {
      const result = await savePersonalNote(
        formTitle.trim() || "Anotação rápida",
        formContent.trim(),
        tags,
      );

      if (result.success) {
        toast.success("Anotação criada com sucesso!");
        refreshNotes();
      } else {
        toast.danger(result.message ?? "Não foi possível criar a anotação.");
      }
    });
  };

  // Abrir modal de edição
  const handleOpenEditModal = (note: StudentNote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormTags(note.tags ? note.tags.join(", ") : "");
    setFormPinned(!!note.pinned);
    setIsEditModalOpen(true);
  };

  // Salvar edição
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    if (!formContent.trim()) {
      toast.danger("O conteúdo da anotação não pode ficar vazio.");
      return;
    }

    const tags = formTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const target = editingNote;
    setIsEditModalOpen(false);
    setEditingNote(null);

    startMutation(async () => {
      const result = await updateNote(target.id, {
        title: formTitle.trim() || "Anotação sem título",
        content: formContent.trim(),
        tags,
      });

      if (result.success) {
        if (formPinned !== target.pinned) await togglePinNote(target.id);
        toast.success("Anotação atualizada com sucesso!");
        refreshNotes();
      } else {
        toast.danger(result.message ?? "Não foi possível atualizar.");
      }
    });
  };

  // Abrir modal de visualização completa
  const handleOpenViewModal = (note: StudentNote) => {
    setViewingNote(note);
    setIsViewModalOpen(true);
  };

  // Exportar todas as anotações como Markdown
  const handleExportMarkdown = () => {
    if (notes.length === 0) {
      toast.danger("Nenhuma anotação disponível para exportar.");
      return;
    }

    const markdown = exportNotesAsMarkdown(notes);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smart-lms-anotacoes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Arquivo Markdown baixado com sucesso!");
  };

  // Contagens por categoria
  const counts = useMemo(() => {
    return {
      todas: notes.length,
      aulas: notes.filter((n) => isLessonNote(n)).length,
      agentes: notes.filter((n) => isAgentNote(n)).length,
      pessoal: notes.filter((n) => isPersonalNote(n)).length,
      fixadas: notes.filter((n) => n.pinned).length,
    };
  }, [notes]);

  // Filtragem e ordenação
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("pt-BR");

    let result = notes.filter((note) => {
      // Filtro por categoria
      if (selectedCategory === "aulas" && !isLessonNote(note)) return false;
      if (selectedCategory === "agentes" && !isAgentNote(note)) return false;
      if (selectedCategory === "pessoal" && !isPersonalNote(note)) return false;
      if (selectedCategory === "fixadas" && !note.pinned) return false;

      // Filtro por busca
      if (!query) return true;

      const titleMatch = note.title.toLocaleLowerCase("pt-BR").includes(query);
      const contentMatch = note.content.toLocaleLowerCase("pt-BR").includes(query);
      const tagsMatch = note.tags?.some((t) => t.toLocaleLowerCase("pt-BR").includes(query));

      return titleMatch || contentMatch || tagsMatch;
    });

    // Ordenação (Fixadas sempre vêm primeiro)
    result = [...result].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      if (sortBy === "recent") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title, "pt-BR");
      }
      return 0;
    });

    return result;
  }, [notes, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="pt-24 pb-20 sm:pt-28 md:pt-32">
      {/* =====================================================================
          CABEÇALHO EDITORIAL
      ====================================================================== */}
      <section className="border-b border-hairline/80 pb-10 sm:pb-14">
        <div className="editorial-container">
          <Rise>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/70 px-3.5 py-1 text-xs font-semibold text-muted backdrop-blur-md">
                  <span className="flex size-2 rounded-full bg-accent animate-pulse" />
                  <span>Caderno Pessoal & Insights</span>
                </div>

                <h1 className="display-1 mt-4 text-foreground tracking-tight">
                  Ideias que merecem continuar com você.
                </h1>
                <p className="lede mt-3 text-muted">
                  Releia seus insights, filtre por aulas ou agentes de IA e transforme anotações em ações práticas para o seu dia a dia.
                </p>

                {isLoaded && notes.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="font-semibold text-foreground">
                      {notes.length} {notes.length === 1 ? "anotação salva" : "anotações salvas"}
                    </span>
                    <span>•</span>
                    <span>
                      {counts.fixadas > 0 && `${counts.fixadas} fixadas • `}
                      {counts.aulas} de aulas • {counts.agentes} de agentes • {counts.pessoal} pessoais
                    </span>
                  </div>
                )}
              </div>

              {/* Botões de Ação Principal */}
              <div className="flex flex-wrap items-center gap-3">
                {isLoaded && notes.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={handleExportMarkdown}
                    className="h-11 gap-2 rounded-xl px-4 font-semibold shadow-surface cursor-pointer"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    <span>Exportar (.md)</span>
                  </Button>
                )}

                <Button
                  variant="primary"
                  onClick={handleOpenCreateModal}
                  className="h-11 gap-2 rounded-xl px-5 font-semibold shadow-md cursor-pointer"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  <span>Nova anotação</span>
                </Button>
              </div>
            </div>
          </Rise>
        </div>
      </section>

      {/* =====================================================================
          CONTEÚDO PRINCIPAL
      ====================================================================== */}
      <section className="editorial-container py-8 sm:py-12">
        {!isLoaded ? (
          /* Estado Carregando */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Carregando suas anotações" aria-busy="true">
            {[1, 2, 3].map((item) => (
              <Card key={item} className="p-6 gap-4 border-hairline bg-surface/50">
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </Card>
            ))}
          </div>
        ) : notes.length === 0 ? (
          /* =================================================================
             ESTADO VAZIO (EMPTY STATE) REFINADO & CENTRALIZADO
          ================================================================== */
          <Rise>
            <div className="mx-auto max-w-3xl rounded-3xl border border-border/70 bg-surface/60 p-8 sm:p-12 shadow-surface backdrop-blur-xl text-center">
              {/* Ícone Principal Centralizado com Margem de Respiro */}
              <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-accent-soft text-accent-soft-foreground shadow-sm mb-2">
                <span className="icon-draw">
                  <NoteIcon size={38} />
                </span>
              </div>

              <h2 className="display-3 mt-5 text-foreground font-bold">
                Seu caderno está pronto para as suas ideias
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                Suas anotações feitas durante as aulas, conversas com os agentes de IA ou registradas por você ficam organizadas aqui com busca rápida e filtros inteligentes.
              </p>

              {/* Grade de Atalhos com Ícones, Textos e Botões Centralizados */}
              <div className="mt-10 grid gap-4 text-center sm:grid-cols-3">
                {/* Card 1: Anotação Rápida */}
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="group flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:bg-accent-soft/10 hover:shadow-md cursor-pointer"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground transition-all duration-200 group-hover:scale-110 group-hover:bg-accent group-hover:text-white shadow-xs">
                      <Plus className="size-5" />
                    </div>
                    <h3 className="mt-4 font-bold text-base text-foreground">Anotação Rápida</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted max-w-[200px]">
                      Escreva um insight, lembrete ou meta pessoal agora mesmo.
                    </p>
                  </div>
                  <div className="mt-6 flex w-full justify-center">
                    <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent/20 bg-accent-soft/40 py-2.5 px-3 text-xs font-bold text-accent transition-all group-hover:bg-accent group-hover:text-white">
                      Criar agora <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                </button>

                {/* Card 2: Anotar em Aula */}
                <Link
                  href="/cursos"
                  className="group flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:bg-accent-soft/10 hover:shadow-md"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground transition-all duration-200 group-hover:scale-110 group-hover:bg-accent group-hover:text-white shadow-xs">
                      <BookOpen className="size-5" />
                    </div>
                    <h3 className="mt-4 font-bold text-base text-foreground">Anotar em Aula</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted max-w-[200px]">
                      Abra a aba “Anotações” no player para registrar pontos-chave.
                    </p>
                  </div>
                  <div className="mt-6 flex w-full justify-center">
                    <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent/20 bg-accent-soft/40 py-2.5 px-3 text-xs font-bold text-accent transition-all group-hover:bg-accent group-hover:text-white">
                      Explorar Cursos <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                </Link>

                {/* Card 3: Resumos com IA */}
                <Link
                  href="/agentes"
                  className="group flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:bg-accent-soft/10 hover:shadow-md"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground transition-all duration-200 group-hover:scale-110 group-hover:bg-accent group-hover:text-white shadow-xs">
                      <Bot className="size-5" />
                    </div>
                    <h3 className="mt-4 font-bold text-base text-foreground">Resumos com IA</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted max-w-[200px]">
                      Peça sínteses e planos de carreira para os mentores virtuais.
                    </p>
                  </div>
                  <div className="mt-6 flex w-full justify-center">
                    <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent/20 bg-accent-soft/40 py-2.5 px-3 text-xs font-bold text-accent transition-all group-hover:bg-accent group-hover:text-white">
                      Ver Agentes <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                </Link>
              </div>

            </div>
          </Rise>
        ) : (
          /* =================================================================
             ESTADO COM ANOTAÇÕES: BARRA DE FILTROS & BUSCA
          ================================================================== */
          <>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Abas de Categorias */}
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("todas")}
                  className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                    selectedCategory === "todas"
                      ? "bg-foreground text-background shadow-xs"
                      : "border border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <span>Todas</span>
                  <span className="rounded-full bg-surface-hover/80 px-1.5 py-0.5 text-[10px] text-inherit">
                    {counts.todas}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory("aulas")}
                  className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                    selectedCategory === "aulas"
                      ? "bg-accent text-white shadow-xs"
                      : "border border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <BookOpen className="size-3.5" />
                  <span>Aulas</span>
                  <span className="rounded-full bg-surface-hover/80 px-1.5 py-0.5 text-[10px] text-inherit">
                    {counts.aulas}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory("agentes")}
                  className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                    selectedCategory === "agentes"
                      ? "bg-accent text-white shadow-xs"
                      : "border border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <Bot className="size-3.5" />
                  <span>Agentes IA</span>
                  <span className="rounded-full bg-surface-hover/80 px-1.5 py-0.5 text-[10px] text-inherit">
                    {counts.agentes}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory("pessoal")}
                  className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                    selectedCategory === "pessoal"
                      ? "bg-accent text-white shadow-xs"
                      : "border border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <FileText className="size-3.5" />
                  <span>Pessoais</span>
                  <span className="rounded-full bg-surface-hover/80 px-1.5 py-0.5 text-[10px] text-inherit">
                    {counts.pessoal}
                  </span>
                </button>

                {counts.fixadas > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("fixadas")}
                    className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors cursor-pointer ${
                      selectedCategory === "fixadas"
                        ? "bg-warning text-warning-foreground shadow-xs"
                        : "border border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <Star className="size-3.5 fill-warning text-warning" />
                    <span>Fixadas</span>
                    <span className="rounded-full bg-surface-hover/80 px-1.5 py-0.5 text-[10px] text-inherit">
                      {counts.fixadas}
                    </span>
                  </button>
                )}
              </div>

              {/* Campo de Busca & Ordenação */}
              <div className="flex flex-wrap items-center gap-3">
                <SearchField
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className="w-full sm:w-72"
                >
                  <SearchField.Group className="h-10 rounded-xl bg-surface border-border">
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Buscar em anotações..." />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>

                <select
                  aria-label="Ordenar anotações"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-surface-hover cursor-pointer"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="oldest">Mais antigas</option>
                  <option value="title">Título (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Resultado vazio da busca */}
            {filteredNotes.length === 0 ? (
              <div className="rounded-3xl border border-border/80 bg-surface/50 p-12 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-default text-muted">
                  <Search className="size-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                  Nenhuma anotação encontrada
                </h3>
                <p className="mt-1.5 text-sm text-muted">
                  Não encontramos nada correspondente ao termo “{searchQuery}” ou filtro selecionado.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("todas");
                    }}
                    className="cursor-pointer"
                  >
                    Limpar busca e filtros
                  </Button>
                </div>
              </div>
            ) : (
              /* =============================================================
                 GRID DE ANOTAÇÕES
              ============================================================== */
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredNotes.map((note, index) => {
                  const isAgent = isAgentNote(note);
                  const isPersonal = isPersonalNote(note);
                  const isLesson = !isAgent && !isPersonal;

                  return (
                    <Rise key={note.id} className="min-w-0" delay={Math.min(index, 6) * 50}>
                      <Reveal className="h-full rounded-2xl">
                        <Card
                          onClick={() => handleOpenViewModal(note)}
                          className={`group relative flex flex-col justify-between h-full min-h-[300px] border p-5 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-elev-3 ${
                            note.pinned
                              ? "border-warning/40 bg-gradient-to-b from-warning/5 via-surface to-surface shadow-xs"
                              : "border-hairline bg-surface hover:border-hairline-strong"
                          }`}
                        >
                          {/* Cabeçalho do Card */}
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              {/* Badge de Origem */}
                              {isAgent ? (
                                <Chip size="sm" variant="soft" color="accent" className="font-semibold text-[11px] gap-1">
                                  <Bot className="size-3" />
                                  <span>Agente IA</span>
                                </Chip>
                              ) : isPersonal ? (
                                <Chip size="sm" variant="soft" color="default" className="font-semibold text-[11px] gap-1">
                                  <FileText className="size-3" />
                                  <span>Pessoal</span>
                                </Chip>
                              ) : (
                                <Chip size="sm" variant="soft" color="success" className="font-semibold text-[11px] gap-1">
                                  <BookOpen className="size-3" />
                                  <span>Aula</span>
                                </Chip>
                              )}

                              {/* Ações Rápidas do Card */}
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  title={note.pinned ? "Desafixar do topo" : "Fixar no topo"}
                                  onClick={(e) => handleTogglePin(note.id, e)}
                                  className={`grid size-9 place-items-center rounded-lg transition-colors cursor-pointer ${
                                    note.pinned
                                      ? "text-warning hover:bg-warning/10"
                                      : "text-muted opacity-80 hover:bg-surface-hover hover:text-foreground"
                                  }`}
                                >
                                  <Star className={`size-4 ${note.pinned ? "fill-warning" : ""}`} />
                                </button>

                                <div className="hidden sm:flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    type="button"
                                    title="Copiar anotação"
                                    onClick={(e) => handleCopyContent(note, e)}
                                    className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                                  >
                                    {copiedId === note.id ? (
                                      <Check className="size-4 text-success" />
                                    ) : (
                                      <Copy className="size-4" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    title="Editar anotação"
                                    onClick={(e) => handleOpenEditModal(note, e)}
                                    className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                                  >
                                    <Edit3 className="size-4" />
                                  </button>

                                  <button
                                    type="button"
                                    title="Excluir anotação"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmNote(note);
                                    }}
                                    className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Data de Modificação */}
                            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                              <Calendar className="size-3" />
                              <time dateTime={note.updatedAt}>{formatRelativeDate(note.updatedAt)}</time>
                            </div>

                            {/* Título da Anotação */}
                            <h2 className="font-display mt-2.5 text-base font-bold leading-snug tracking-tight text-foreground line-clamp-2">
                              {note.title}
                            </h2>

                            {/* Trecho do Conteúdo */}
                            <p className="mt-3 text-xs leading-relaxed text-muted line-clamp-5 whitespace-pre-wrap">
                              {note.content}
                            </p>

                            {/* Tags */}
                            {note.tags && note.tags.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-1.5">
                                {note.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-md bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-muted"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Rodapé do Card com Link Contextual */}
                          <div className="mt-6 pt-4 border-t border-hairline/80 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                            {isAgent ? (
                              <Link
                                href="/agentes"
                                className={buttonVariants({ variant: "secondary", size: "sm" }) + " w-full justify-between rounded-xl"}
                              >
                                <span>Voltar aos agentes</span>
                                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                              </Link>
                            ) : isLesson ? (
                              <Link
                                href={
                                  note.courseId && note.lessonId
                                    ? `/courses/${note.courseId}/lessons/${note.lessonId}`
                                    : note.lessonId
                                      ? `/courses/c1/lessons/${note.lessonId}`
                                      : "/cursos"
                                }
                                className={buttonVariants({ variant: "secondary", size: "sm" }) + " w-full justify-between rounded-xl"}
                              >
                                <span>Reabrir aula</span>
                                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                              </Link>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                fullWidth
                                onClick={() => handleOpenViewModal(note)}
                                className="justify-between rounded-xl cursor-pointer"
                              >
                                <span>Ver completa</span>
                                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      </Reveal>
                    </Rise>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* =====================================================================
          MODAL: CRIAR NOVA ANOTAÇÃO (UX FECHAR NO CANTO SUPERIOR DIREITO)
      ====================================================================== */}
      <Modal.Root isOpen={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md" scroll="inside">
            <Modal.Dialog className="relative max-w-lg w-full mt-auto sm:mt-0 rounded-none rounded-t-3xl sm:rounded-3xl border border-border bg-background p-6 sm:p-7 shadow-2xl overflow-hidden">
              {/* Botão Fechar no Canto Superior Direito (Padrão UX) */}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Fechar modal"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 grid size-9 place-items-center rounded-full bg-surface-hover/80 text-muted transition-all hover:bg-surface-hover hover:text-foreground hover:scale-105 cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <form onSubmit={handleSaveNewNote}>
                <Modal.Header className="flex items-center gap-3.5 pb-4 border-b border-border/80 pr-12">
                  <div className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground shadow-xs shrink-0">
                    <Plus className="size-5" />
                  </div>
                  <div>
                    <Modal.Heading className="font-display text-lg font-bold text-foreground">
                      Nova Anotação
                    </Modal.Heading>
                    <p className="text-xs text-muted">Caderno de estudos e insights pessoais</p>
                  </div>
                </Modal.Header>

                <Modal.Body className="space-y-4 py-5">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Título ou Tema
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Ideias para projeto, Resumo de estudo..."
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Conteúdo da Anotação <span className="text-danger">*</span>
                    </label>
                    <textarea
                      rows={6}
                      placeholder="Escreva suas ideias, pontos-chave, dúvidas ou planos de ação..."
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-surface p-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent resize-y"
                    />
                    <p className="mt-1 text-right text-[11px] text-muted">
                      {formContent.length} caracteres • {formContent.trim().split(/\s+/).filter(Boolean).length} palavras
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Tags (separadas por vírgula)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: React, Arquitetura, Carreira, Meta"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full h-10 rounded-xl border border-border bg-surface px-3.5 text-xs text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formPinned}
                        onChange={(e) => setFormPinned(e.target.checked)}
                        className="size-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span>Fixar esta anotação no topo do caderno</span>
                    </label>
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-xl px-5 font-semibold cursor-pointer"
                  >
                    Salvar Anotação
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      {/* =====================================================================
          MODAL: EDITAR ANOTAÇÃO (UX FECHAR NO CANTO SUPERIOR DIREITO)
      ====================================================================== */}
      <Modal.Root isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md" scroll="inside">
            <Modal.Dialog className="relative max-w-lg w-full mt-auto sm:mt-0 rounded-none rounded-t-3xl sm:rounded-3xl border border-border bg-background p-6 sm:p-7 shadow-2xl overflow-hidden">
              {/* Botão Fechar no Canto Superior Direito */}
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Fechar modal"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 grid size-9 place-items-center rounded-full bg-surface-hover/80 text-muted transition-all hover:bg-surface-hover hover:text-foreground hover:scale-105 cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <form onSubmit={handleSaveEdit}>
                <Modal.Header className="flex items-center gap-3.5 pb-4 border-b border-border/80 pr-12">
                  <div className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground shadow-xs shrink-0">
                    <Edit3 className="size-5" />
                  </div>
                  <div>
                    <Modal.Heading className="font-display text-lg font-bold text-foreground">
                      Editar Anotação
                    </Modal.Heading>
                    <p className="text-xs text-muted">Atualize o título, tags ou texto</p>
                  </div>
                </Modal.Header>

                <Modal.Body className="space-y-4 py-5">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Título
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full h-11 rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Conteúdo <span className="text-danger">*</span>
                    </label>
                    <textarea
                      rows={7}
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-surface p-3.5 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-accent resize-y"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">
                      Tags (separadas por vírgula)
                    </label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="w-full h-10 rounded-xl border border-border bg-surface px-3.5 text-xs text-foreground outline-none transition-colors focus:border-accent"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formPinned}
                        onChange={(e) => setFormPinned(e.target.checked)}
                        className="size-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span>Fixar esta anotação no topo do caderno</span>
                    </label>
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-xl px-5 font-semibold cursor-pointer"
                  >
                    Salvar Alterações
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      {/* =====================================================================
          MODAL: VISUALIZAR ANOTAÇÃO COMPLETA (LEITURA DETALHADA)
      ====================================================================== */}
      <Modal.Root isOpen={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog className="relative max-w-2xl w-full mt-auto sm:mt-0 rounded-none rounded-t-3xl sm:rounded-3xl border border-border bg-background p-6 sm:p-8 shadow-2xl overflow-hidden">
              {/* Botão Fechar no Canto Superior Direito */}
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                aria-label="Fechar visualização"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 grid size-9 place-items-center rounded-full bg-surface-hover/80 text-muted transition-all hover:bg-surface-hover hover:text-foreground hover:scale-105 cursor-pointer"
              >
                <X className="size-4" />
              </button>

              {viewingNote && (
                <>
                  <Modal.Header className="flex flex-col gap-2 pb-5 border-b border-border/80 pr-12">
                    <div className="flex flex-wrap items-center gap-2">
                      {isAgentNote(viewingNote) ? (
                        <Chip size="sm" variant="soft" color="accent" className="font-semibold text-[11px] gap-1">
                          <Bot className="size-3" />
                          <span>Agente IA</span>
                        </Chip>
                      ) : isPersonalNote(viewingNote) ? (
                        <Chip size="sm" variant="soft" color="default" className="font-semibold text-[11px] gap-1">
                          <FileText className="size-3" />
                          <span>Anotação Pessoal</span>
                        </Chip>
                      ) : (
                        <Chip size="sm" variant="soft" color="success" className="font-semibold text-[11px] gap-1">
                          <BookOpen className="size-3" />
                          <span>Aula / Curso</span>
                        </Chip>
                      )}

                      <span className="text-xs text-muted">
                        Atualizado em {new Date(viewingNote.updatedAt).toLocaleDateString("pt-BR")} às {new Date(viewingNote.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <Modal.Heading className="font-display text-xl font-bold leading-snug text-foreground">
                      {viewingNote.title}
                    </Modal.Heading>
                  </Modal.Header>

                  <Modal.Body className="py-6">
                    <div className="rounded-2xl border border-border/60 bg-surface/50 p-5 sm:p-6">
                      <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-foreground">
                        {viewingNote.content}
                      </p>
                    </div>

                    {viewingNote.tags && viewingNote.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Tag className="size-3.5 text-muted" />
                        {viewingNote.tags.map((tag) => (
                          <Chip key={tag} size="sm" variant="soft">
                            #{tag}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </Modal.Body>

                  <Modal.Footer className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-border/80">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyContent(viewingNote)}
                        className="gap-1.5 rounded-xl cursor-pointer"
                      >
                        <Copy className="size-3.5" />
                        Copiar
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsViewModalOpen(false);
                          handleOpenEditModal(viewingNote);
                        }}
                        className="gap-1.5 rounded-xl cursor-pointer"
                      >
                        <Edit3 className="size-3.5" />
                        Editar
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsViewModalOpen(false);
                          setDeleteConfirmNote(viewingNote);
                        }}
                        className="gap-1.5 rounded-xl text-danger hover:bg-danger/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAgentNote(viewingNote) && (
                        <Link
                          href="/agentes"
                          className={buttonVariants({ variant: "primary", size: "sm" }) + " rounded-xl gap-1"}
                        >
                          Ir para Agentes <ArrowUpRight className="size-3.5" />
                        </Link>
                      )}

                      {isLessonNote(viewingNote) && (
                        <Link
                          href={
                            viewingNote.courseId && viewingNote.lessonId
                              ? `/courses/${viewingNote.courseId}/lessons/${viewingNote.lessonId}`
                              : viewingNote.lessonId
                                ? `/courses/c1/lessons/${viewingNote.lessonId}`
                                : "/cursos"
                          }
                          className={buttonVariants({ variant: "primary", size: "sm" }) + " rounded-xl gap-1"}
                        >
                          Reabrir Aula <ArrowUpRight className="size-3.5" />
                        </Link>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsViewModalOpen(false)}
                        className="rounded-xl cursor-pointer"
                      >
                        Fechar
                      </Button>
                    </div>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      {/* =====================================================================
          MODAL: CONFIRMAR EXCLUSÃO
      ====================================================================== */}
      <Modal.Root isOpen={!!deleteConfirmNote} onOpenChange={(open) => !open && setDeleteConfirmNote(null)}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="relative max-w-sm w-full mt-auto sm:mt-0 rounded-none rounded-t-3xl sm:rounded-3xl border border-border bg-background p-6 shadow-2xl overflow-hidden">
              {/* Botão Fechar no Canto Superior Direito */}
              <button
                type="button"
                onClick={() => setDeleteConfirmNote(null)}
                aria-label="Fechar modal"
                className="absolute top-4 right-4 z-20 grid size-9 place-items-center rounded-full bg-surface-hover/80 text-muted transition-all hover:bg-surface-hover hover:text-foreground hover:scale-105 cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <Modal.Header className="flex items-center gap-3 pr-10">
                <div className="grid size-10 place-items-center rounded-xl bg-danger/10 text-danger shrink-0">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <Modal.Heading className="font-display text-base font-bold text-foreground">
                    Excluir anotação?
                  </Modal.Heading>
                  <p className="text-xs text-muted">Esta ação não pode ser desfeita.</p>
                </div>
              </Modal.Header>

              <Modal.Body className="py-4">
                <p className="text-xs text-muted">
                  Você está prestes a excluir permanentemente a anotação{" "}
                  <strong className="text-foreground font-semibold">“{deleteConfirmNote?.title}”</strong>.
                </p>
              </Modal.Body>

              <Modal.Footer className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirmNote(null)}
                  className="rounded-xl cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteConfirm}
                  className="rounded-xl font-semibold cursor-pointer"
                >
                  Sim, excluir
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
