"use client";

import Link from "next/link";
import { ExternalLink, Play, Star, Timer } from "lucide-react";
import { Button, Chip, Modal, Separator } from "@heroui/react";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { AgentScriptTester } from "@/components/admin/agentes/AgentScriptTester";
import { StatusBadge } from "@/components/ui/editorial";
import type { Agent } from "@/types/agente";

type AgentPreviewModalProps = {
  agent: Agent | null;
  onClose: () => void;
};

const toneForStatus = (status: Agent["status"]) => {
  if (status === "Disponível") return "positive" as const;
  if (status === "Beta") return "primary" as const;
  return "warning" as const;
};

export function AgentPreviewModal({ agent, onClose }: AgentPreviewModalProps) {
  if (!agent) return null;

  return (
    <Modal.Root
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog className="max-w-3xl sm:w-[46rem]">
            <Modal.Header>
              <div className="flex items-center gap-3">
                <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                  <Play className="size-5" aria-hidden="true" />
                </Modal.Icon>
                <div>
                  <Modal.Heading className="font-display text-lg font-bold">
                    Prévia de {agent.name}
                  </Modal.Heading>
                  <p className="text-xs text-muted">Como o aluno vê o agente — e um teste do roteiro.</p>
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-6 py-2">
              {/* Card como aparece em /agentes */}
              <section>
                <p className="eyebrow mb-3">Card público</p>
                <div className="rounded-2xl border border-border bg-background-secondary p-5">
                  <div className="flex items-start gap-4">
                    <AgentAvatar
                      avatar={agent.avatar}
                      size="lg"
                      isMuted={agent.status === "Em manutenção"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-foreground">{agent.name}</h3>
                        <StatusBadge tone={toneForStatus(agent.status)}>{agent.status}</StatusBadge>
                      </div>
                      <p className="text-sm font-semibold text-muted">{agent.role}</p>
                      <p className="mt-2.5 text-sm leading-relaxed text-foreground">{agent.description}</p>

                      {agent.skills.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {agent.skills.map((skill) => (
                            <li key={skill}>
                              <Chip color="default" variant="soft" size="sm">
                                {skill}
                              </Chip>
                            </li>
                          ))}
                        </ul>
                      )}

                      <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <Star className="size-3.5" aria-hidden="true" />
                          <dt className="sr-only">Avaliação</dt>
                          <dd data-numeric>{agent.rating.toFixed(1)}</dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Timer className="size-3.5" aria-hidden="true" />
                          <dt className="sr-only">Duração típica</dt>
                          <dd data-numeric>{agent.avgMinutes} min</dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <dt>Curso:</dt>
                          <dd className="font-semibold text-accent">{agent.courseTitle}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </section>

              {agent.status === "Em manutenção" && agent.unavailableNote && (
                <div className="rounded-xl border border-warning/30 bg-warning-soft p-4">
                  <p className="text-sm font-semibold text-warning-soft-foreground">Fora do ar</p>
                  <p className="mt-1 text-sm leading-relaxed text-warning-soft-foreground">
                    {agent.unavailableNote}
                  </p>
                </div>
              )}

              <Separator />

              {/* Abertura da conversa */}
              <section>
                <p className="eyebrow mb-3">Abertura da conversa</p>
                <div className="flex items-start gap-3">
                  <AgentAvatar avatar={agent.avatar} size="sm" />
                  <p className="max-w-lg rounded-2xl rounded-tl-sm bg-surface-secondary px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-foreground">
                    {agent.greeting}
                  </p>
                </div>

                {agent.starters.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {agent.starters.map((starter) => (
                      <li key={starter.id}>
                        <Chip color="default" variant="soft" size="sm">
                          {starter.label}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <Separator />

              <AgentScriptTester agent={agent} />
            </Modal.Body>

            <Modal.Footer>
              <Button variant="tertiary" type="button" onClick={onClose}>
                Fechar
              </Button>
              <Link
                href={`/agentes/${agent.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Abrir página pública
              </Link>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
