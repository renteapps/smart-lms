"use server";

import { requireAdmin } from "@/lib/supabase/auth";

/**
 * Prévia de um link externo mapeado na curadoria da trilha.
 *
 * O admin cola a URL e a plataforma busca no próprio site o que ele publica em
 * Open Graph — imagem e título. Sem isso, todo link externo entrava na trilha do
 * aluno com a capa genérica de fallback, ao lado de aulas e artigos que têm
 * imagem própria.
 *
 * A busca é feita **no servidor**, e não no navegador do admin, porque o site de
 * destino não manda cabeçalho CORS. Isso significa que a nossa infraestrutura
 * passa a fazer requisições para um endereço que veio de um formulário — por
 * isso as travas abaixo: só admin, só http(s), nada de endereço privado, no
 * máximo três redirecionamentos (cada um revalidado) e um teto de corpo e de
 * tempo. Rebind de DNS (nome público que resolve para IP interno) não é coberto;
 * a superfície é restrita a administradores autenticados.
 */

export type LinkPreview = {
  image?: string;
  title?: string;
  siteName?: string;
};

export type LinkPreviewResult =
  | { success: true; preview: LinkPreview }
  | { success: false; message: string };

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 512 * 1024;
const TIMEOUT_MS = 6000;

const BLOCKED_HOSTNAME = /^(localhost|\[?::1\]?|.*\.local|.*\.internal)$/i;

/** Endereços que não podem ser alvo: laço local, rede privada, link-local, multicast. */
function isBlockedHost(hostname: string): boolean {
  if (BLOCKED_HOSTNAME.test(hostname)) return true;

  const parts = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!parts) return false;

  const [a, b] = [Number(parts[1]), Number(parts[2])];
  return a === 0
    || a === 10
    || a === 127
    || a >= 224
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
}

function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (isBlockedHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Lê as `<meta>` sem depender da ordem dos atributos, que varia muito na web real. */
function readMetaTags(html: string): Map<string, string> {
  const found = new Map<string, string>();

  for (const tag of html.match(/<meta\s[^>]*>/gi) ?? []) {
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    // A primeira ocorrência vence: sites repetem og:image para variações menores.
    if (key && content && !found.has(key)) found.set(key, decodeEntities(content.trim()));
  }

  return found;
}

/**
 * Provedores que respondem melhor por oEmbed do que por scraping.
 *
 * O YouTube devolve para um cliente sem sessão uma página de consentimento sem
 * nenhuma tag Open Graph — e vídeo é o link externo mais comum num LMS. O
 * endpoint oficial resolve isso sem raspar HTML nenhum.
 */
function oEmbedEndpointFor(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');
  const target = encodeURIComponent(url.toString());

  if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
    return `https://www.youtube.com/oembed?format=json&url=${target}`;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    return `https://vimeo.com/api/oembed.json?url=${target}`;
  }
  return null;
}

async function fetchOEmbed(endpoint: string): Promise<LinkPreview | null> {
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;

    const data = await response.json() as { title?: string; thumbnail_url?: string; provider_name?: string };
    const image = data.thumbnail_url ? safeUrl(data.thumbnail_url)?.toString() : undefined;
    if (!image && !data.title) return null;

    return { image, title: data.title, siteName: data.provider_name };
  } catch {
    return null;
  }
}

async function fetchHtml(target: URL): Promise<{ html: string; finalUrl: URL } | null> {
  let current = target;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Alguns sites devolvem 403 para cliente sem user-agent reconhecível.
        "user-agent": "Mozilla/5.0 (compatible; SmartLMS-LinkPreview/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? safeUrl(new URL(location, current).toString()) : null;
      if (!next) return null;
      current = next;
      continue;
    }

    if (!response.ok) return null;
    if (!(response.headers.get("content-type") ?? "").includes("html")) return null;
    if (Number(response.headers.get("content-length") ?? 0) > MAX_HTML_BYTES * 8) return null;

    return { html: (await response.text()).slice(0, MAX_HTML_BYTES), finalUrl: current };
  }

  return null;
}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreviewResult> {
  try {
    await requireAdmin();

    const target = safeUrl(rawUrl.trim());
    if (!target) return { success: false, message: "Informe uma URL http(s) pública." };

    const endpoint = oEmbedEndpointFor(target);
    if (endpoint) {
      const embedded = await fetchOEmbed(endpoint);
      if (embedded) return { success: true, preview: embedded };
    }

    const page = await fetchHtml(target);
    if (!page) return { success: false, message: "Não foi possível ler esse endereço." };

    const meta = readMetaTags(page.html);
    const rawImage = meta.get("og:image")
      ?? meta.get("og:image:url")
      ?? meta.get("twitter:image")
      ?? meta.get("twitter:image:src");

    // Muitos sites publicam a imagem em caminho relativo — resolver contra a URL final.
    const image = rawImage
      ? safeUrl(new URL(rawImage, page.finalUrl).toString())?.toString()
      : undefined;

    const documentTitle = /<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(page.html)?.[1];
    const title = meta.get("og:title")
      ?? meta.get("twitter:title")
      ?? (documentTitle ? decodeEntities(documentTitle).trim() : undefined);

    return {
      success: true,
      preview: { image, title, siteName: meta.get("og:site_name") ?? page.finalUrl.hostname },
    };
  } catch (error) {
    const message = (error as Error).name === "TimeoutError"
      ? "O site demorou demais para responder."
      : (error as Error).message;
    return { success: false, message };
  }
}
