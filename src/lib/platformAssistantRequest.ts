import { ASSISTANT_MAX_MESSAGE_CHARS } from "@/lib/platformAssistantContext";
import type { AssistantScope } from "@/types/platformAssistant";

export class PlatformAssistantError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "assistant_error") {
    super(message);
    this.name = "PlatformAssistantError";
    this.status = status;
    this.code = code;
  }
}

function assertPlainObject(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PlatformAssistantError(message, 400, "invalid_request");
  }
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: string[]) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new PlatformAssistantError("A requisição contém campos não permitidos.", 400, "invalid_request");
  }
}

export function parseAssistantScope(value: unknown): AssistantScope {
  assertPlainObject(value, "Escopo inválido.");
  if (value.kind === "platform") {
    rejectUnknownKeys(value, ["kind"]);
    return { kind: "platform" };
  }
  if (value.kind === "course") {
    rejectUnknownKeys(value, ["kind", "courseId", "lessonId"]);
    if (typeof value.courseId !== "string" || !value.courseId.trim()) {
      throw new PlatformAssistantError("Curso inválido.", 400, "invalid_scope");
    }
    if (value.lessonId != null && (typeof value.lessonId !== "string" || !value.lessonId.trim())) {
      throw new PlatformAssistantError("Aula inválida.", 400, "invalid_scope");
    }
    return {
      kind: "course",
      courseId: value.courseId.trim(),
      lessonId: typeof value.lessonId === "string" ? value.lessonId.trim() : undefined,
    };
  }
  throw new PlatformAssistantError("Escopo inválido.", 400, "invalid_scope");
}

export function parseAssistantPostBody(value: unknown): { message: string; scope: AssistantScope } {
  assertPlainObject(value, "Corpo da requisição inválido.");
  rejectUnknownKeys(value, ["message", "scope"]);
  if (typeof value.message !== "string" || !value.message.trim()) {
    throw new PlatformAssistantError("Digite uma mensagem.", 400, "invalid_message");
  }
  const message = value.message.trim();
  if (message.length > ASSISTANT_MAX_MESSAGE_CHARS) {
    throw new PlatformAssistantError(
      `A mensagem deve ter no máximo ${ASSISTANT_MAX_MESSAGE_CHARS.toLocaleString("pt-BR")} caracteres.`,
      400,
      "message_too_long",
    );
  }
  return { message, scope: parseAssistantScope(value.scope) };
}
