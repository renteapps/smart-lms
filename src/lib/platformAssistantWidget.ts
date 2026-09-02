/**
 * Lógica pura do widget flutuante do Assistente IA.
 *
 * Fica fora do componente para poder ser testada sem DOM: é aqui que mora a
 * tradução de rota em escopo e a conta que mantém a conversa acima do teclado
 * no celular.
 */
import type { AssistantScope, PlatformAssistantPublicConfig } from "@/types/platformAssistant";

/** Deriva curso/aula da URL — é o que dá contexto ao assistente. */
export function scopeFromPath(pathname: string): AssistantScope {
  const match = pathname.match(/^\/courses\/([^/]+)(?:\/lessons\/([^/]+))?/);
  if (!match) return { kind: "platform" };
  return {
    kind: "course",
    courseId: decodeURIComponent(match[1]),
    lessonId: match[2] ? decodeURIComponent(match[2]) : undefined,
  };
}

/** Identidade local da conversa: muda quando o aluno troca de curso ou aula. */
export function scopeKey(scope: AssistantScope): string {
  return scope.kind === "platform" ? "platform" : `course:${scope.courseId}:${scope.lessonId ?? "overview"}`;
}

export function scopeQuery(scope: AssistantScope): string {
  const params = new URLSearchParams({ kind: scope.kind });
  if (scope.kind === "course") {
    params.set("courseId", scope.courseId);
    if (scope.lessonId) params.set("lessonId", scope.lessonId);
  }
  return params.toString();
}

/**
 * Abaixo disto a diferença entre as duas alturas é barra de navegação do
 * navegador, não teclado. Levantar o painel por causa dela faria a conversa
 * "pular" a cada rolagem no iOS.
 */
const KEYBOARD_MIN_INSET = 150;

/**
 * Altura ocupada pelo teclado virtual, em px.
 *
 * No Android e no iOS o teclado encolhe apenas o *visual viewport*: o layout
 * (e portanto qualquer elemento `fixed`) continua do tamanho da tela inteira,
 * e é por isso que um chat ancorado embaixo some atrás do teclado. A diferença
 * entre as duas alturas — descontando o quanto o visual viewport foi rolado —
 * é exatamente o que precisamos levantar o painel.
 */
export function keyboardInset(
  layoutHeight: number,
  viewport: { height: number; offsetTop: number } | null | undefined,
): number {
  if (!viewport) return 0;
  const inset = layoutHeight - viewport.height - viewport.offsetTop;
  return inset > KEYBOARD_MIN_INSET ? Math.round(inset) : 0;
}

/** Sugestões de abertura, coladas em onde o aluno está. */
export function assistantStarters(scope: AssistantScope, config: PlatformAssistantPublicConfig): string[] {
  if (scope.kind === "platform") {
    return config.startersPlatform;
  }
  if (scope.lessonId) {
    return config.startersLesson;
  }
  return config.startersCourse;
}
