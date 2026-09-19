const PLACEHOLDER_ORIGIN = "http://internal.invalid";

/**
 * Normaliza um destino pós-login (`?next=` / `?redirect=`) para um caminho
 * relativo do próprio site, ou devolve `fallback`.
 *
 * Sem isso, `/acessar?next=javascript:...` executava JS com a sessão recém-
 * criada (`window.location.href = next`) e `?next=//evil.tld` virava open
 * redirect. A checagem usa o parser de URL do navegador/Node — o mesmo que vai
 * interpretar o destino — em vez de regex, então `/\evil.tld`, tabs/quebras de
 * linha embutidas e esquemas com maiúsculas caem no fallback.
 */
export function safeRedirect(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;

  try {
    const url = new URL(raw, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
