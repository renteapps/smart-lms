"use client";

import type { ComponentPropsWithoutRef } from "react";
import { inputVariants } from "@heroui/react";
import { cn } from "@/lib/utils";

/**
 * `<select>` nativo com o visual dos campos do HeroUI (`Input`). Prefira-o ao
 * `Select` composto quando a lista é longa, dinâmica ou precisa de `multiple`:
 * mantém o seletor do sistema no mobile e é acessível por padrão.
 * Sempre informe `aria-label` ou associe um `<label htmlFor>`.
 */
export function NativeSelect({ className, multiple, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      multiple={multiple}
      className={cn(inputVariants(), "w-full", !multiple && "min-h-10 cursor-pointer", className)}
      {...props}
    />
  );
}
