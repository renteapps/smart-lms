/**
 * Fuso horário padrão da plataforma Smart LMS: São Paulo, Brasil.
 * America/Sao_Paulo (UTC-3).
 */
export const PLATFORM_TIMEZONE = "America/Sao_Paulo";
export const PLATFORM_LOCALE = "pt-BR";

export type ArticleStatus = "published" | "scheduled" | "draft";

/**
 * Retorna o status de um artigo com base nas flags e na data de publicação.
 */
export function getArticleStatus(
  isPublished: boolean,
  publishedAt: string | number | Date | null | undefined,
): ArticleStatus {
  if (!isPublished) return "draft";
  if (!publishedAt) return "published";

  const pubTime = new Date(publishedAt).getTime();
  if (isNaN(pubTime)) return "published";

  return pubTime > Date.now() ? "scheduled" : "published";
}

/**
 * Formata uma data no fuso de São Paulo usando pt-BR.
 */
export function formatPlatformDate(
  date: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  if (!date) return "—";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat(PLATFORM_LOCALE, {
    timeZone: PLATFORM_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Formata data e hora completas no fuso de São Paulo (ex.: 24/08/2026 às 14:30).
 */
export function formatPlatformDateTime(
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date) return "—";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PLATFORM_TIMEZONE,
    ...options,
  };

  const formatted = new Intl.DateTimeFormat(PLATFORM_LOCALE, defaultOptions).format(d);
  return formatted.replace(", ", " às ");
}

/**
 * Converte qualquer data (Date, timestamp ISO ou milissegundos) para o formato
 * "YYYY-MM-DDTHH:mm" no fuso de São Paulo (compatível com <input type="datetime-local" />).
 */
export function isoToSaoPauloLocalInput(date: string | number | Date = new Date()): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLATFORM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  if (hour === "24") hour = "00";
  const minute = get("minute");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Converte o valor retornado por um <input type="datetime-local" /> (ex.: "2026-08-25T14:30")
 * assumindo o fuso horário de São Paulo (America/Sao_Paulo) e retorna a string ISO UTC (ex.: "2026-08-25T17:30:00.000Z").
 */
export function saoPauloLocalInputToIso(localDatetimeStr: string): string {
  if (!localDatetimeStr || !localDatetimeStr.includes("T")) {
    return new Date().toISOString();
  }

  const [datePart, timePart] = localDatetimeStr.split("T");
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr] = timePart.split(":");

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
    return new Date().toISOString();
  }

  // Fuso horário de São Paulo é UTC-3.
  const tempUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const spOffsetMinutes = getSaoPauloOffsetMinutes(tempUtc);
  const exactUtcTimestamp = tempUtc.getTime() - spOffsetMinutes * 60 * 1000;

  return new Date(exactUtcTimestamp).toISOString();
}

/**
 * Calcula o offset em minutos de America/Sao_Paulo em relação ao UTC para uma data.
 * Para UTC-3, retorna -180.
 */
function getSaoPauloOffsetMinutes(date: Date): number {
  const utcDateStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const spDateStr = date.toLocaleString("en-US", { timeZone: PLATFORM_TIMEZONE });
  const utcMillis = new Date(utcDateStr).getTime();
  const spMillis = new Date(spDateStr).getTime();
  return (spMillis - utcMillis) / 60000;
}
