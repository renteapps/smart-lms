"use client";

import Link from "next/link";
import { Clock3, MessageCircle, Star, Wrench } from "lucide-react";
import { Card, Chip } from "@heroui/react";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import type { Agent } from "@/types/agente";
import { cn } from "@/lib/utils";

const countFormatter = new Intl.NumberFormat("pt-BR");
const ratingFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type AgentCardProps = {
  agent: Agent;
  /** Threads que o aluno já abriu com este agente — muda o rótulo da ação. */
  conversationCount: number;
  /** Realce de borda seguindo o cursor. Reservado ao primeiro card da grade. */
  featured?: boolean;
};

export default function AgentCard({ agent, conversationCount, featured = false }: AgentCardProps) {
  const isUnavailable = agent.status === "Em manutenção";
  const hasConversation = conversationCount > 0;
  const extraSkills = agent.skills.length - 2;

  const body = (
    <>
      {/* Um gesto por card: o foco de luz do Reveal somado ao `.lift`. */}
      <Reveal edge={featured && !isUnavailable} className="h-full rounded-2xl">
        <Card
          className={cn(
            "h-full gap-0 border-hairline p-5",
            isUnavailable ? "bg-background-secondary opacity-75" : "lift",
          )}
        >
          <div className="flex items-start gap-4">
            <AgentAvatar avatar={agent.avatar} isMuted={isUnavailable} />
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-extrabold leading-snug tracking-[-0.025em] text-foreground">
                {agent.name}
              </h3>
              <p className="mt-0.5 truncate text-sm font-semibold text-muted">{agent.role}</p>
            </div>

            {isUnavailable ? (
              <Chip size="sm" variant="soft" color="warning" className="shrink-0">
                <Wrench className="size-3" aria-hidden="true" />
                Manutenção
              </Chip>
            ) : agent.status === "Beta" ? (
              <Chip size="sm" variant="soft" color="default" className="shrink-0">
                Beta
              </Chip>
            ) : null}
          </div>

          <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">
            {isUnavailable ? agent.unavailableNote : agent.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {agent.skills.slice(0, 2).map((skill) => (
              <Chip key={skill} size="sm" variant="tertiary" color="default">
                {skill}
              </Chip>
            ))}
            {extraSkills > 0 && (
              <span className="text-xs font-semibold text-muted" data-numeric>
                +{extraSkills}
              </span>
            )}
          </div>

          <div className="mt-4 border-t border-hairline pt-4 text-xs leading-5 text-muted">
            <p>
              Publicado por <span className="font-semibold text-foreground">{agent.createdBy}</span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-accent font-medium">
                {agent.courseTitles && agent.courseTitles.length > 0
                  ? agent.courseTitles.length === 1
                    ? agent.courseTitles[0]
                    : `${agent.courseTitles[0]} (+${agent.courseTitles.length - 1} cursos)`
                  : agent.courseTitle || "Acesso Geral"}
              </span>
              {agent.planNames && agent.planNames.length > 0 && (
                <Chip size="sm" variant="soft" color="accent" className="text-[10px] py-0 px-1.5">
                  {agent.planNames.length === 1
                    ? agent.planNames[0]
                    : `${agent.planNames[0]} (+${agent.planNames.length - 1})`}
                </Chip>
              )}
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between gap-4 pt-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted" data-numeric>
              {/* Agente recém-publicado ainda não tem nota: "0,0" leria como péssimo. */}
              {agent.conversationsCount > 0 && (
                <>
                  <span className="flex items-center gap-1.5">
                    <Star className="size-3.5" aria-hidden="true" />
                    {ratingFormatter.format(agent.rating)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="size-3.5" aria-hidden="true" />
                    {countFormatter.format(agent.conversationsCount)}
                  </span>
                </>
              )}
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" aria-hidden="true" />~{agent.avgMinutes} min
              </span>
            </div>

            {!isUnavailable && (
              <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-accent">
                {hasConversation ? "Continuar" : "Conversar"}
                <span
                  aria-hidden="true"
                  className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground transition-[background-color,color,transform] duration-[var(--duration-md)] group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-accent-foreground"
                >
                  <ArrowIcon size={16} />
                </span>
              </span>
            )}
          </div>

          {hasConversation && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs font-semibold text-accent-soft-foreground">
              <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
              <span data-numeric>
                {conversationCount} {conversationCount === 1 ? "conversa sua" : "conversas suas"} com{" "}
                {agent.name}
              </span>
            </p>
          )}
        </Card>
      </Reveal>
    </>
  );

  /*
   * Agente em manutenção não tem para onde levar: vira um card inerte, sem
   * link, em vez de um link que abre uma conversa impossível.
   */
  if (isUnavailable) {
    return (
      <div aria-disabled="true" className="block h-full w-full min-w-0 rounded-2xl">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/agentes/${agent.slug}`}
      aria-label={`${hasConversation ? "Continuar conversa com" : "Conversar com"} ${agent.name}, ${agent.role}`}
      className="icon-draw group block h-full w-full min-w-0 rounded-2xl text-left"
    >
      {body}
    </Link>
  );
}
