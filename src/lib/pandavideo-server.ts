import "server-only";

import { requireAdmin } from "@/lib/supabase/auth";

const PANDA_VIDEO_API_URL = "https://api-v2.pandavideo.com.br";

export class PandaVideoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "PandaVideoApiError";
  }
}

async function getPandaVideoApiKey(): Promise<string> {
  const { adminClient } = await requireAdmin();
  const environmentApiKey = process.env.PANDAVIDEO_API_KEY?.trim();

  const { data: integration, error } = await adminClient
    .from("integrations")
    .select("enabled, secrets")
    .eq("slug", "pandavideo")
    .maybeSingle();

  if (error) {
    throw new PandaVideoApiError("Não foi possível ler a configuração do PandaVideo.", 500, "INTEGRATION_READ_ERROR");
  }

  const integrationApiKey = integration?.enabled && typeof integration.secrets?.apiKey === "string"
    ? integration.secrets.apiKey.trim()
    : "";
  const apiKey = integrationApiKey || environmentApiKey;

  if (!apiKey) {
    throw new PandaVideoApiError(
      "A integração PandaVideo ainda não está configurada.",
      400,
      "PANDAVIDEO_NOT_CONFIGURED",
    );
  }

  return apiKey;
}

export async function fetchPandaVideo(path: string, searchParams?: URLSearchParams): Promise<unknown> {
  const apiKey = await getPandaVideoApiKey();
  const url = new URL(path, PANDA_VIDEO_API_URL);
  if (searchParams) url.search = searchParams.toString();

  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
      Accept: "application/json",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    const status = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw new PandaVideoApiError(
      response.status === 401
        ? "A chave da integração PandaVideo foi recusada."
        : "O PandaVideo não conseguiu concluir esta consulta.",
      status,
      "PANDAVIDEO_API_ERROR",
    );
  }

  return response.json();
}

export async function fetchPandaVideoSubtitleText(
  videoId: string,
  preferredLanguages: string[] = ["pt-BR", "pt", "en", "es"]
): Promise<{ success: boolean; vttContent?: string; error?: string }> {
  const apiKey = await getPandaVideoApiKey();
  const cleanId = encodeURIComponent(videoId.trim());

  for (const lang of preferredLanguages) {
    const url = new URL(`/subtitles/${cleanId}/${encodeURIComponent(lang)}`, PANDA_VIDEO_API_URL);

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 0) {
        return { success: true, vttContent: text };
      }
    } else if (response.status === 401) {
      throw new PandaVideoApiError("A chave da integração PandaVideo foi recusada.", 401, "UNAUTHORIZED");
    }
    // Status 400 ou 404 significa que este vídeo não tem legenda no idioma testado
  }

  return {
    success: false,
    error: "Nenhuma legenda encontrada para este vídeo no PandaVideo.",
  };
}

export function pandaVideoErrorResponse(error: unknown): Response {
  if (error instanceof PandaVideoApiError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Erro desconhecido";
  if (message.includes("Sessão expirada")) {
    return Response.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (message.includes("Acesso restrito")) {
    return Response.json({ error: message, code: "FORBIDDEN" }, { status: 403 });
  }

  console.error("Erro na integração PandaVideo:", error);
  return Response.json(
    { error: "Não foi possível consultar a biblioteca PandaVideo.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
