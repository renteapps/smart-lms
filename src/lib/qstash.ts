import { Client } from "@upstash/qstash";

const qstashToken = process.env.QSTASH_TOKEN;

let client: Client | null = null;
if (qstashToken) {
  client = new Client({ token: qstashToken });
}

export function getQStashClient(): Client | null {
  return client;
}

function getAppBaseUrl(): string | null {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return null;
}

/**
 * Agenda a revalidação de cache de um post no QStash para o momento exato de sua publicação.
 * Se o QStash não estiver configurado ou se a publicação for imediata, encerra graciosamente sem erro.
 */
export async function scheduleBlogRevalidation(slug: string, publishAt: string | Date): Promise<boolean> {
  try {
    if (!client) {
      // QStash não configurado; a plataforma funciona perfeitamente via consulta com corte temporal
      return false;
    }

    const appBaseUrl = getAppBaseUrl();
    if (!appBaseUrl) {
      console.warn("[QStash] URL base da aplicação não configurada (NEXT_PUBLIC_APP_URL ou VERCEL_URL).");
      return false;
    }

    const pubTime = new Date(publishAt).getTime();
    const delaySeconds = Math.max(0, Math.floor((pubTime - Date.now()) / 1000));

    // Se já passou ou falta menos de 5 segundos, a revalidação direta do Next.js já atende
    if (delaySeconds <= 5) {
      return false;
    }

    const destinationUrl = `${appBaseUrl}/api/webhooks/qstash/publish-scheduled`;

    await client.publishJSON({
      url: destinationUrl,
      body: { slug, scheduledFor: new Date(publishAt).toISOString() },
      delay: delaySeconds,
    });

    return true;
  } catch (error) {
    console.error("[QStash] Falha ao agendar revalidação:", error);
    return false;
  }
}
