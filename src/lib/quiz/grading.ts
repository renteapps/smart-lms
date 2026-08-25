import { normalizeTag } from "@/lib/matching";
import type { QuizQuestion } from "@/types/quiz";

/**
 * Nota fracionária (0..1) de uma pergunta. multiple_choice/true_false/
 * multiple_select/open_ended/fill_table são tudo-ou-nada; matching e
 * fill_blank dão crédito parcial por item correto (par / lacuna).
 */
export function gradeQuestion(question: QuizQuestion, answer: unknown): number {
  switch (question.type) {
    case "open_ended": {
      return typeof answer === "string" && answer.trim().length > 0 ? 1 : 0;
    }

    case "multiple_select": {
      const options = question.options ?? [];
      const correctIds = options.filter((opt) => opt.isCorrect).map((opt) => opt.id);
      const given = Array.isArray(answer) ? (answer as string[]) : [];
      const isExactMatch =
        correctIds.length === given.length && correctIds.every((id) => given.includes(id));
      return isExactMatch ? 1 : 0;
    }

    case "matching": {
      const pairs = question.pairs ?? [];
      if (pairs.length === 0) return 0;
      const given = answer && typeof answer === "object" ? (answer as Record<string, string>) : {};
      const correctCount = pairs.filter((pair) => given[pair.id] === pair.id).length;
      return correctCount / pairs.length;
    }

    case "fill_table": {
      const minRows = question.minRows ?? 1;
      const rows = Array.isArray(answer) ? (answer as Record<string, string>[]) : [];
      const filledRows = rows.filter((row) =>
        row && Object.values(row).some((value) => typeof value === "string" && value.trim().length > 0)
      );
      return filledRows.length >= minRows ? 1 : 0;
    }

    case "fill_blank": {
      const blanks = question.blanks ?? [];
      if (blanks.length === 0) return 0;
      const given = answer && typeof answer === "object" ? (answer as Record<string, string>) : {};
      const correctCount = blanks.filter((blank) => {
        const value = given[blank.id];
        if (typeof value !== "string" || value.trim().length === 0) return false;
        const normalized = normalizeTag(value);
        return blank.acceptedAnswers.some((accepted) => normalizeTag(accepted) === normalized);
      }).length;
      return correctCount / blanks.length;
    }

    case "multiple_choice":
    case "true_false":
    default: {
      const options = question.options ?? [];
      const correctOption = options.find((opt) => opt.isCorrect);
      return correctOption && answer === correctOption.id ? 1 : 0;
    }
  }
}

/** Se a pergunta tem uma resposta "utilizável" o suficiente para avançar/finalizar o quiz. */
export function isQuestionAnswered(question: QuizQuestion, answer: unknown): boolean {
  switch (question.type) {
    case "multiple_select": {
      return Array.isArray(answer) && answer.length > 0;
    }
    case "open_ended": {
      return typeof answer === "string" && answer.trim().length > 0;
    }
    case "matching": {
      const pairs = question.pairs ?? [];
      if (pairs.length === 0) return false;
      const given = answer && typeof answer === "object" ? (answer as Record<string, string>) : {};
      return pairs.every((pair) => typeof given[pair.id] === "string" && given[pair.id].length > 0);
    }
    case "fill_table": {
      const minRows = question.minRows ?? 1;
      const rows = Array.isArray(answer) ? (answer as Record<string, string>[]) : [];
      const filledRows = rows.filter((row) =>
        row && Object.values(row).some((value) => typeof value === "string" && value.trim().length > 0)
      );
      return filledRows.length >= minRows;
    }
    case "fill_blank": {
      const blanks = question.blanks ?? [];
      if (blanks.length === 0) return false;
      const given = answer && typeof answer === "object" ? (answer as Record<string, string>) : {};
      return blanks.every(
        (blank) => typeof given[blank.id] === "string" && given[blank.id].trim().length > 0
      );
    }
    default: {
      return Boolean(answer);
    }
  }
}

/** Nota final 0..100 e aprovação. Quiz sem perguntas aprova automaticamente (comportamento pré-existente). */
export function computeQuizScore(
  questions: QuizQuestion[],
  answers: Record<string, unknown>,
  passingScore: number
): { score: number; passed: boolean } {
  const total = questions.length;
  const sum = questions.reduce((acc, q) => acc + gradeQuestion(q, answers[q.id]), 0);
  const score = total > 0 ? Math.round((sum / total) * 100) : 100;
  return { score, passed: score >= passingScore };
}
