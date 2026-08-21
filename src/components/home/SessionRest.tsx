"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Clock3, Lock } from "lucide-react";
import { ProgressBar } from "@heroui/react/progress-bar";
import { Label } from "@heroui/react/label";
import { buttonVariants } from "@heroui/styles";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Rise } from "@/components/ui/Rise";
import { useCardTransition } from "@/contexts/CardTransitionContext";
import { contentHref, type HomeSession } from "@/lib/studentHome";
import type { LearningTrailItem } from "@/types/trilha";
import { cn } from "@/lib/utils";

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1000&auto=format&fit=crop";

type RowProps = {
  item: LearningTrailItem;
  locked: boolean;
  completed: boolean;
  /** Artigo e link externo não avisam que foram lidos — quem declara é o aluno. */
  onComplete?: (item: LearningTrailItem) => void;
  isCompleting?: boolean;
};

/**
 * Linhas compactas, nunca cards.
 *
 * Dois cards do mesmo peso competiriam com o próximo passo e desfariam a
 * hierarquia que esta seção existe para criar.
 */
function ContentRow({ item, locked, completed, onComplete, isCompleting = false }: RowProps) {
  const { triggerTransition } = useCardTransition();
  const targetHref = contentHref(item);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      locked ||
      completed ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey ||
      !targetHref ||
      targetHref === "#" ||
      targetHref.startsWith("http")
    ) {
      return;
    }

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerTransition({
      sourceRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 12,
      },
      metadata: {
        title: item.title,
        cover: item.cover || DEFAULT_COVER,
        category: item.moduleName || "Sessão de Estudos",
        duration: `${item.durationMin} min`,
        type: "lesson",
      },
      href: targetHref,
    });
  };

  const body = (
    <>
      <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
        <Image src={item.cover || DEFAULT_COVER} alt="" fill unoptimized sizes="3.5rem" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          {completed ? (
            <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />
          ) : locked ? (
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          <span data-numeric>
            {completed ? "Concluído" : locked ? "Bloqueado" : `${item.durationMin} min`}
          </span>
        </span>
      </span>
      {!locked && !completed && (
        <span className="shrink-0 text-muted" aria-hidden="true">
          <ArrowIcon size={16} />
        </span>
      )}
    </>
  );

  const shell = "flex items-center gap-4 rounded-xl border border-hairline bg-surface p-3";
  const interactive = "icon-spring shadow-elev-1 transition-[box-shadow,border-color,transform] duration-[var(--duration-md)] hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-elev-2";

  if (locked || completed) {
    return <div className={`${shell} opacity-70`}>{body}</div>;
  }

  const link = (
    <Link href={targetHref} onClick={handleClick} className={`${shell} ${interactive} min-w-0 flex-1`}>
      {body}
    </Link>
  );

  const selfReported = Boolean(onComplete)
    && (item.type === "article" || item.type === "external_link");
  if (!selfReported) return link;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {link}
      <button
        type="button"
        disabled={isCompleting}
        onClick={() => onComplete?.(item)}
        aria-label={`Marcar ${item.title} como concluído`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 max-sm:w-full max-sm:justify-center")}
      >
        <Check className="size-3.5" aria-hidden="true" />
        {isCompleting ? "…" : "Já concluí"}
      </button>
    </div>
  );
}

type SessionRestProps = {
  session: HomeSession;
  /** O item já apresentado no herói — não se repete aqui. */
  excludeId: string;
  onComplete?: (item: LearningTrailItem) => void;
  /** Id em gravação, para desabilitar só a linha que está sendo registrada. */
  completingId?: string | null;
};

export default function SessionRest({ session, excludeId, onComplete, completingId }: SessionRestProps) {
  const rest = session.items.filter((item) => item.id !== excludeId);
  if (rest.length === 0) return null;

  const doneCount = session.done.length;
  const pendingIds = new Set(session.pending.map((item) => item.id));

  return (
    <section className="editorial-container pb-[clamp(2rem,4vw,3rem)]">
      <Rise>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="eyebrow">Depois disso</p>
          <div className="w-full max-w-xs">
            <ProgressBar
              value={session.items.length ? (doneCount / session.items.length) * 100 : 0}
              color="accent"
              size="sm"
            >
              <Label className="text-xs font-semibold text-muted">
                <span data-numeric>
                  {doneCount} de {session.items.length}
                </span>{" "}
                concluídos
              </Label>
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </div>
        </div>

        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {rest.map((item) => (
            <li key={item.id}>
              <ContentRow
                item={item}
                completed={item.status === "completed"}
                locked={Boolean(item.prerequisites?.some((id) => pendingIds.has(id)))}
                onComplete={onComplete}
                isCompleting={completingId === item.id}
              />
            </li>
          ))}
        </ul>
      </Rise>
    </section>
  );
}
