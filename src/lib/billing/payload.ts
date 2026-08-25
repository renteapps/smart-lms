import { createHash } from "node:crypto";

/**
 * Leitura defensiva do payload dos gateways.
 *
 * Por que ler por *lista* de caminhos em vez de um caminho fixo: Eduzz e
 * Hotmart versionam webhook sem aviso e renomeiam campos entre versões (a
 * Hotmart tem v1 e v2.0.0 em produção ao mesmo tempo, com formatos diferentes).
 * Amarrar num único caminho significa que uma venda deixa de ser processada em
 * silêncio no dia em que o formato muda.
 *
 * O payload cru fica guardado em `gateway_webhook_events.payload`, então quando
 * um evento chega sem casar com nenhum caminho conhecido dá para abrir o
 * registro no admin, ver a forma real e acrescentar o caminho aqui.
 */

type Json = unknown;

export function readPath(source: Json, path: string): Json {
  return path.split(".").reduce<Json>((acc, segment) => {
    if (acc === null || acc === undefined) return undefined;
    if (Array.isArray(acc)) {
      const index = Number(segment);
      return Number.isInteger(index) ? acc[index] : undefined;
    }
    if (typeof acc !== "object") return undefined;
    return (acc as Record<string, Json>)[segment];
  }, source);
}

export function pickBoolean(source: Json, paths: readonly string[]): boolean | undefined {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.trim().toLowerCase() === "true") return true;
      if (value.trim().toLowerCase() === "false") return false;
    }
  }
  return undefined;
}

export function pickString(source: Json, paths: readonly string[]): string | undefined {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export function pickNumber(source: Json, paths: readonly string[]): number | undefined {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      // Aceita tanto "1234.56" quanto "1.234,56": a Eduzz manda valores já
      // formatados em pt-BR em alguns campos.
      const normalized = /,\d{1,2}$/.test(value.trim())
        ? value.trim().replace(/\./g, "").replace(",", ".")
        : value.trim();
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

/**
 * Normaliza data para ISO. A Hotmart manda epoch (milissegundos); a Eduzz manda
 * string ISO. O corte em 1e12 separa segundos de milissegundos — qualquer data
 * depois de 2001 em milissegundos passa disso, e qualquer epoch em segundos até
 * o ano 33658 fica abaixo.
 */
export function toIsoDate(value: Json): string | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const millis = value > 1e12 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value.trim());
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

export function pickDate(source: Json, paths: readonly string[]): string | undefined {
  for (const path of paths) {
    const iso = toIsoDate(readPath(source, path));
    if (iso) return iso;
  }
  return undefined;
}

/**
 * Identidade do evento para a trava de idempotência.
 *
 * Quando o gateway manda um id próprio, usa-se ele. Quando não manda, deriva-se
 * um hash estável dos campos que definem "o mesmo acontecimento": tipo do
 * evento, transação e status. Precisa ser **determinístico** — é justamente o
 * reenvio do mesmo payload que ele tem de reconhecer.
 */
export function deriveEventId(input: {
  providedId?: string;
  gateway: string;
  eventType: string;
  transactionId?: string;
  status?: string;
}): string {
  if (input.providedId?.trim()) return input.providedId.trim();

  const seed = [input.gateway, input.eventType, input.transactionId ?? "", input.status ?? ""].join("|");
  return `derived_${createHash("sha256").update(seed, "utf8").digest("hex").slice(0, 32)}`;
}

/** E-mail em minúsculas e sem espaços — é a chave de busca do comprador. */
export function normalizeEmail(value: string | undefined): string | undefined {
  const email = value?.trim().toLowerCase();
  if (!email || !email.includes("@")) return undefined;
  return email;
}
