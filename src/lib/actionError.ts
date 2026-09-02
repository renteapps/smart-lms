type ErrorRecord = {
  code?: unknown;
  message?: unknown;
};

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return asNonEmptyString(error.message) ?? fallback;
  if (!error || typeof error !== "object") return fallback;

  const record = error as ErrorRecord;
  const message = asNonEmptyString(record.message);
  const code = asNonEmptyString(record.code);
  if (!message) return fallback;
  return code ? `${message} [${code}]` : message;
}

