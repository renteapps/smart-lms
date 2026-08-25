"use client";

import { Suspense } from "react";
import { useParams, notFound } from "next/navigation";
import { ResendIntegrationContent } from "../ResendIntegrationContent";
import { OpenRouterIntegrationContent } from "../OpenRouterIntegrationContent";
import { PandaVideoIntegrationContent } from "../PandaVideoIntegrationContent";
import { EduzzIntegrationContent } from "../EduzzIntegrationContent";
import { HotmartIntegrationContent } from "../HotmartIntegrationContent";

export default function IntegracaoDetalhePage() {
  const params = useParams();
  const slug = params.slug as string;

  const KNOWN_SLUGS = ["eduzz", "hotmart", "resend", "openrouter", "pandavideo"];
  if (!KNOWN_SLUGS.includes(slug)) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Carregando integração...</div>}>
      {slug === "openrouter" ? (
        <OpenRouterIntegrationContent />
      ) : slug === "resend" ? (
        <ResendIntegrationContent />
      ) : slug === "pandavideo" ? (
        <PandaVideoIntegrationContent />
      ) : slug === "eduzz" ? (
        <EduzzIntegrationContent />
      ) : (
        <HotmartIntegrationContent />
      )}
    </Suspense>
  );
}
