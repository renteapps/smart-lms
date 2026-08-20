"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { AlertTriangle, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  reflexao: { label: "Para refletir", icon: Lightbulb, className: "border-accent bg-accent-soft text-accent-soft-foreground" },
  dica: { label: "Dica", icon: Sparkles, className: "border-success bg-success-soft text-success-soft-foreground" },
  atencao: { label: "Atenção", icon: AlertTriangle, className: "border-warning bg-warning-soft text-warning-soft-foreground" },
} as const;

export const calloutBlockConfig = {
  type: "callout",
  propSchema: {
    variant: { default: "reflexao" as const, values: ["reflexao", "dica", "atencao"] as const },
  },
  content: "inline",
} as const;

export const CalloutBlock = createReactBlockSpec(calloutBlockConfig, {
  render: ({ block, editor, contentRef }) => {
    const variant = VARIANTS[block.props.variant] ?? VARIANTS.reflexao;
    const Icon = variant.icon;

    return (
      <div className={cn("my-2 w-full rounded-xl border-l-4 p-4", variant.className)}>
        {editor.isEditable && (
          <div contentEditable={false} className="mb-2 flex items-center gap-2">
            {(Object.keys(VARIANTS) as Array<keyof typeof VARIANTS>).map((key) => {
              const option = VARIANTS[key];
              const OptionIcon = option.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => editor.updateBlock(block, { props: { variant: key } })}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    block.props.variant === key ? "bg-foreground/10" : "opacity-50 hover:opacity-100",
                  )}
                >
                  <OptionIcon className="size-3" aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
        {!editor.isEditable && (
          <p className="eyebrow mb-2 flex items-center gap-2">
            <Icon className="size-4" aria-hidden="true" />
            {variant.label}
          </p>
        )}
        <div ref={contentRef} className="text-base leading-relaxed" />
      </div>
    );
  },
});
