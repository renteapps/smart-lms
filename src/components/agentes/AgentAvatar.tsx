"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  Compass,
  Drama,
  GraduationCap,
  Handshake,
  MessagesSquare,
  Presentation,
  UserRoundCheck,
} from "lucide-react";
import type { AgentAvatarKey } from "@/types/agente";
import { cn } from "@/lib/utils";

/**
 * Identidade visual do agente. O tom é decorativo — quem comunica estado é o
 * chip com texto e ícone, nunca a cor da marca do agente sozinha.
 */
const avatars: Record<AgentAvatarKey, { icon: LucideIcon; tone: string }> = {
  feedback: { icon: MessagesSquare, tone: "bg-accent-soft text-accent-soft-foreground" },
  contratacao: { icon: Handshake, tone: "bg-success-soft text-success-soft-foreground" },
  simulacao: { icon: Drama, tone: "bg-warning-soft text-warning-soft-foreground" },
  tutor: { icon: GraduationCap, tone: "bg-accent-soft text-accent-soft-foreground" },
  rotina: { icon: CalendarClock, tone: "bg-success-soft text-success-soft-foreground" },
  "um-a-um": { icon: UserRoundCheck, tone: "bg-warning-soft text-warning-soft-foreground" },
  carreira: { icon: Compass, tone: "bg-accent-soft text-accent-soft-foreground" },
  apresentacao: { icon: Presentation, tone: "bg-success-soft text-success-soft-foreground" },
};

const containerSizes = {
  sm: "size-8 rounded-lg",
  md: "size-12 rounded-xl",
  lg: "size-14 rounded-2xl",
} as const;

const iconSizes = {
  sm: "size-4",
  md: "size-5.5",
  lg: "size-6",
} as const;

type AgentAvatarProps = {
  avatar: AgentAvatarKey;
  size?: keyof typeof containerSizes;
  /** Agente fora do ar: perde a cor de identidade para não parecer ativo. */
  isMuted?: boolean;
  className?: string;
};

export function AgentAvatar({ avatar, size = "md", isMuted = false, className }: AgentAvatarProps) {
  const { icon: Icon, tone } = avatars[avatar];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center",
        containerSizes[size],
        isMuted ? "bg-default text-muted" : tone,
        className,
      )}
    >
      <Icon className={iconSizes[size]} />
    </span>
  );
}
