"use client";

import type { ReactNode } from "react";
import { Switch } from "@heroui/react";
import { cn } from "@/lib/utils";

type SwitchRowProps = {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  isDisabled?: boolean;
  className?: string;
};

/**
 * Linha de configuração com chave liga/desliga: rótulo e descrição à esquerda,
 * chave à direita.
 *
 * No HeroUI v3 `Switch.Content` é o botão clicável e precisa envolver o
 * `Switch.Control`. Com o controle fora dele, a chave vira só decoração: o
 * `.switch` é `flex-col`, então ela desce para baixo do texto e só o rótulo
 * responde ao clique. Use este componente em vez de montar o Switch à mão.
 */
export function SwitchRow({ isSelected, onChange, label, description, isDisabled, className }: SwitchRowProps) {
  return (
    <Switch isSelected={isSelected} onChange={onChange} isDisabled={isDisabled} className={cn("w-full", className)}>
      <Switch.Content className="flex w-full items-center justify-between gap-4 text-left">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{label}</span>
          {description && <span className="mt-0.5 block text-xs font-normal leading-5 text-muted">{description}</span>}
        </span>
        <Switch.Control className="shrink-0">
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}
