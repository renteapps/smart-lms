"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@heroui/react";
import { toast } from "@/lib/toast";

export function CopyCertLinkButton({ validationHash }: { validationHash: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const url = `${window.location.origin}/certificados/${validationHash}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link de autenticação copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.danger("Não foi possível copiar o link.");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      isIconOnly
      aria-label="Copiar link de autenticação"
      onClick={handleCopy}
      className="shrink-0"
    >
      {copied ? (
        <Check className="size-4 text-success" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}
