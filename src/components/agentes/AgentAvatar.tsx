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
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatSpark01Icon } from "@hugeicons/core-free-icons";
import type { AgentAvatarKey } from "@/types/agente";
import { cn } from "@/lib/utils";

/**
 * Identidade visual do agente. O tom é decorativo — quem comunica estado é o
 * chip com texto e ícone, nunca a cor da marca do agente sozinha.
 */
const avatars: Partial<Record<AgentAvatarKey, { icon: LucideIcon; tone: string }>> = {
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
  themeColor?: string;
  iconSvg?: string;
  photoUrl?: string;
  size?: keyof typeof containerSizes;
  /** Agente fora do ar: perde a cor de identidade para não parecer ativo. */
  isMuted?: boolean;
  className?: string;
  /** Nome do agente, usado para o alt text da imagem */
  name?: string;
};

export function AgentAvatar({ avatar, themeColor, iconSvg, photoUrl, size = "md", isMuted = false, className, name = "Agente" }: AgentAvatarProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn(
          "object-cover shrink-0",
          containerSizes[size],
          isMuted && "grayscale opacity-50",
          className,
        )}
      />
    );
  }

  const avatarConfig = avatars[avatar];
  const tone = avatarConfig?.tone || "bg-accent-soft text-accent-soft-foreground";
  const customStyle = !isMuted && themeColor ? { backgroundColor: themeColor, color: "#ffffff" } : undefined;

  return (
    <span
      aria-hidden="true"
      style={customStyle}
      className={cn(
        "grid shrink-0 place-items-center",
        containerSizes[size],
        isMuted ? "bg-default text-muted" : (themeColor ? "" : tone),
        className,
      )}
    >
      {iconSvg && !isMuted ? (
        <div 
          className={cn("flex items-center justify-center [&>svg]:size-full [&>svg]:max-w-full [&>svg]:max-h-full", iconSizes[size])} 
          dangerouslySetInnerHTML={{ __html: iconSvg }} 
        />
      ) : avatarConfig ? (
        <avatarConfig.icon className={iconSizes[size]} />
      ) : (
        <HugeiconsIcon icon={BubbleChatSpark01Icon} className={iconSizes[size]} />
      )}
    </span>
  );
}
