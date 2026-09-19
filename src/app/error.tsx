"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@heroui/react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Erro não tratado:", error);
  }, [error]);

  return (
    <div className="editorial-container flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-danger-soft text-danger-soft-foreground shadow-sm">
        <AlertTriangle className="size-8" aria-hidden="true" />
      </span>

      <div className="mt-6">
        <p className="eyebrow text-danger">Instabilidade Temporária</p>
        <h1 className="font-display mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Algo não saiu como esperado
        </h1>
        <p className="lede mx-auto mt-3 max-w-lg text-muted">
          Tivemos uma falha ao processar esta página. Seus dados e progresso estão seguros. Tente recarregar ou voltar para o painel inicial.
          {error.digest && (
            <span className="mt-2 block font-mono text-xs text-muted">
              Código de referência: {error.digest}
            </span>
          )}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="primary"
          onClick={reset}
          className="min-h-11 gap-2 px-5"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Tentar novamente
        </Button>
        <Link
          href="/"
          className={buttonVariants({
            variant: "secondary",
            className: "min-h-11 gap-2 px-5",
          })}
        >
          <Home className="size-4" aria-hidden="true" />
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
