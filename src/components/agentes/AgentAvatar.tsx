"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bot,
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

/**
 * O SVG colado pelo admin vira máscara (data URI), não HTML: SVG dentro de
 * `mask-image` é renderizado como imagem, então `<script>`, `onload` e
 * `<foreignObject>` não executam. Antes ia por `dangerouslySetInnerHTML` e era
 * XSS armazenado para todo aluno que abrisse o catálogo. A cor vem de
 * `currentColor` (background), igual aos ícones de biblioteca que já usam
 * `stroke`/`fill="currentColor"`.
 */
export function svgToMaskImage(svg: string): string | null {
  const trimmed = svg.trim();
  if (!/^<svg[\s>]/i.test(trimmed)) return null;
  // Como imagem avulsa o SVG precisa do namespace, que ícones colados costumam omitir.
  const withNamespace = /\sxmlns=/.test(trimmed.slice(0, trimmed.indexOf(">")))
    ? trimmed
    : trimmed.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(withNamespace)}")`;
}

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
  const iconMask = iconSvg && !isMuted ? svgToMaskImage(iconSvg) : null;

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
      {iconMask ? (
        <span
          className={cn("block bg-current", iconSizes[size])}
          style={{
            maskImage: iconMask,
            WebkitMaskImage: iconMask,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      ) : avatarConfig ? (
        <avatarConfig.icon className={iconSizes[size]} />
      ) : (
        <Bot className={iconSizes[size]} />
      )}
    </span>
  );
}
