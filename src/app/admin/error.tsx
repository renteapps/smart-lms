"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@heroui/react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] Erro não tratado:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger-soft-foreground">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Algo deu errado nesta página</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Ocorreu um erro inesperado ao carregar este conteúdo do painel admin.
          {error.digest && (
            <>
              {" "}
              <span className="font-mono text-xs">(ref: {error.digest})</span>
            </>
          )}
        </p>
      </div>
      <Button
        variant="primary"
        onClick={reset}
        className="gap-2"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Tentar novamente
      </Button>
    </div>
  );
}
