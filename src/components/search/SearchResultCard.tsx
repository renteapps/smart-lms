"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Bot,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Headphones,
  Pin,
  Play,
  Sparkles,
  Star,
  Tag,
  Lock,
  GraduationCap,
} from "lucide-react";
import { Chip } from "@heroui/react";
import { motion } from "framer-motion";
import type { SearchResultItem } from "@/types/search";
import { cn } from "@/lib/utils";

interface SearchResultCardProps {
  item: SearchResultItem;
  query?: string;
  index?: number;
}

export function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim() || !text) {
    return <>{text}</>;
  }

  const removeDiacritics = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const normalizedQuery = removeDiacritics(query.toLowerCase());
  const terms = normalizedQuery.split(/\s+/).filter((t) => t.length > 1);

  if (terms.length === 0) return <>{text}</>;

  const normalizedText = removeDiacritics(text.toLowerCase());
  const regexPattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")).join("|")})`,
    "gi"
  );

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regexPattern.exec(normalizedText)) !== null) {
    const startIndex = match.index;
    const length = match[0].length;

    if (startIndex > lastIndex) {
      parts.push({ text: text.substring(lastIndex, startIndex), highlight: false });
    }

    parts.push({ text: text.substring(startIndex, startIndex + length), highlight: true });
    lastIndex = startIndex + length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlight: false });
  }

  return (
    <>
      {parts.map((part, index) =>
        part.highlight ? (
          <mark
            key={index}
            className="rounded bg-accent-soft px-1 font-semibold text-accent-soft-foreground"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}

export function SearchResultCard({ item, query, index = 0 }: SearchResultCardProps) {
  const { type, title, description, category, url, metadata } = item;

  // Renderizador específico por tipo de resultado
  let content = null;

  const renderAccessBadge = () => {
    if (metadata?.hasAccess === false) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
          <Lock className="size-3 fill-current" aria-hidden="true" />
          Bloqueado
        </span>
      );
    }
    return null;
  };

  switch (type) {
    case "course":
      content = (
        <Link
          href={url || "#"}
          className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-surface p-5 shadow-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md sm:p-6"
        >
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <GraduationCap className="size-4" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Curso · {category || "Geral"}
                </span>
              </div>
              {renderAccessBadge()}
            </div>

            <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-accent sm:text-lg">
              <HighlightText text={title} query={query} />
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2">
              <HighlightText text={description} query={query} />
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
            <span className="text-xs font-medium text-muted">
              {metadata?.level ? `Nível: ${metadata.level}` : "Disponível na plataforma"}
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-accent transition-transform group-hover:translate-x-0.5">
              {metadata?.hasAccess === false ? "Ver detalhes" : "Acessar curso"}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      );
      break;

    case "lesson":
      content = (
        <Link
          href={url || "#"}
          className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-surface p-5 shadow-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md sm:p-6"
        >
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <Play className="size-4 fill-current" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Aula · {metadata?.courseTitle || "Curso"}
                </span>
              </div>
              {renderAccessBadge() || (metadata?.duration && (
                <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {metadata.duration}
                </span>
              ))}
            </div>

            <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-accent sm:text-lg">
              <HighlightText text={title} query={query} />
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2">
              <HighlightText text={description} query={query} />
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
            <span className="text-xs font-medium text-muted">
              {category ? `Módulo: ${category}` : "Disponível na plataforma"}
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-accent transition-transform group-hover:translate-x-0.5">
              {metadata?.hasAccess === false ? "Ver detalhes" : "Acessar aula"}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      );
      break;

    case "agent":
      content = (
        <Link
          href={url || "#"}
          className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-surface p-5 shadow-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md sm:p-6"
        >
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <Bot className="size-4.5" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Agente de IA · {category || "Tutor"}
                </span>
              </div>
              {metadata?.rating && metadata.rating > 0 ? (
                <span className="flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-xs font-bold text-foreground">
                  <Star className="size-3 fill-amber-400 text-amber-500" aria-hidden="true" />
                  {metadata.rating.toFixed(1)}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {metadata?.agentStatus || "Disponível"}
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-accent sm:text-lg">
              <HighlightText text={title} query={query} />
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2">
              <HighlightText text={description} query={query} />
            </p>

            {metadata?.skills && metadata.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {metadata.skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-surface-hover px-2 py-0.5 text-xs font-medium text-muted"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
            <span className="text-xs font-medium text-muted">
              {metadata?.role || "Assistente especializado"}
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-accent transition-transform group-hover:translate-x-0.5">
              Conversar agora
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      );
      break;

    case "article":
      content = (
        <Link
          href={url || "#"}
          className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-surface p-5 shadow-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md sm:p-6"
        >
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  {metadata?.hasAudio ? (
                    <Headphones className="size-4" aria-hidden="true" />
                  ) : (
                    <FileText className="size-4" aria-hidden="true" />
                  )}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Revista / Blog · {category || "Artigo"}
                </span>
              </div>
              {metadata?.readingTime && (
                <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {metadata.readingTime} min de leitura
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-accent sm:text-lg">
              <HighlightText text={title} query={query} />
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2">
              <HighlightText text={description} query={query} />
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
            <span className="text-xs font-medium text-muted">
              Por {metadata?.author || "Equipe Smart LMS"}
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-accent transition-transform group-hover:translate-x-0.5">
              Ler artigo
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      );
      break;

    case "note":
      content = (
        <Link
          href={url || "#"}
          className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-surface p-5 shadow-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md sm:p-6"
        >
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Minha Anotação · {metadata?.noteKind === "agent" ? "Agente" : metadata?.noteKind === "personal" ? "Pessoal" : "Aula"}
                </span>
              </div>
              {metadata?.pinned && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Pin className="size-3 fill-current" aria-hidden="true" />
                  Fixada
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-accent sm:text-lg">
              <HighlightText text={title} query={query} />
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-3 font-mono text-xs bg-surface-hover/50 p-2.5 rounded-lg border border-hairline">
              <HighlightText text={description} query={query} />
            </p>

            {metadata?.tags && metadata.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {metadata.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-0.5 rounded-md bg-surface-hover px-1.5 py-0.5 text-[11px] font-medium text-muted"
                  >
                    <Tag className="size-2.5" aria-hidden="true" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
            <span className="flex items-center gap-1 text-xs text-muted">
              <Calendar className="size-3" aria-hidden="true" />
              {metadata?.updatedAt
                ? new Date(metadata.updatedAt).toLocaleDateString("pt-BR")
                : "Anotação recente"}
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-accent transition-transform group-hover:translate-x-0.5">
              Ver anotação
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      );
      break;

    default:
      content = null;
      break;
  }

  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
    >
      {content}
    </motion.div>
  );
}
