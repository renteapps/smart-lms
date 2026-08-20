import {
  Bot,
  BrainCircuit,
  GraduationCap,
  Headphones,
  MessageSquare,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantIconKey, PlatformAssistantPublicConfig } from "@/types/platformAssistant";

const ICONS: Record<AssistantIconKey, LucideIcon> = {
  sparkles: Sparkles,
  bot: Bot,
  message: MessageSquare,
  brain: BrainCircuit,
  graduation: GraduationCap,
  headset: Headphones,
};

export const ASSISTANT_ICON_LABELS: Record<AssistantIconKey, string> = {
  sparkles: "Brilhos",
  bot: "Robô",
  message: "Mensagem",
  brain: "Cérebro",
  graduation: "Formatura",
  headset: "Atendimento",
};

export function getContrastText(hexColor: string): "#FFFFFF" | "#111827" {
  const hex = /^#[0-9a-f]{6}$/i.test(hexColor) ? hexColor.slice(1) : "3157B7";
  const channels = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#111827" : "#FFFFFF";
}

export function colorWithAlpha(hexColor: string, alpha: number): string {
  const hex = /^#[0-9a-f]{6}$/i.test(hexColor) ? hexColor.slice(1) : "3157B7";
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function AssistantAvatar({
  config,
  className,
  iconClassName,
}: {
  config: Pick<PlatformAssistantPublicConfig, "avatarType" | "avatarUrl" | "iconKey" | "primaryColor">;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = ICONS[config.iconKey] ?? Sparkles;
  const hasPhoto = config.avatarType === "photo" && Boolean(config.avatarUrl);
  return (
    <span
      role={hasPhoto ? "img" : undefined}
      aria-label={hasPhoto ? "Foto do assistente" : undefined}
      aria-hidden={hasPhoto ? undefined : true}
      className={cn("grid shrink-0 place-items-center overflow-hidden bg-center bg-cover", className)}
      style={
        hasPhoto
          ? { backgroundImage: `url(${JSON.stringify(config.avatarUrl)})` }
          : { backgroundColor: config.primaryColor, color: getContrastText(config.primaryColor) }
      }
    >
      {!hasPhoto && <Icon className={cn("size-1/2", iconClassName)} strokeWidth={2.2} />}
    </span>
  );
}
