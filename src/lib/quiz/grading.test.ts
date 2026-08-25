import { describe, expect, it } from "vitest";
import { computeQuizScore, gradeQuestion, isQuestionAnswered } from "./grading";
import type { QuizQuestion } from "@/types/quiz";

describe("gradeQuestion", () => {
  it("grades multiple_choice as all-or-nothing", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "multiple_choice",
      text: "",
      options: [
        { id: "a", text: "A", isCorrect: true },
        { id: "b", text: "B", isCorrect: false },
      ],
    };
    expect(gradeQuestion(q, "a")).toBe(1);
    expect(gradeQuestion(q, "b")).toBe(0);
    expect(gradeQuestion(q, undefined)).toBe(0);
  });

  it("treats true_false as a single-correct-option question", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "true_false",
      text: "",
      options: [
        { id: "t", text: "Verdadeiro", isCorrect: true },
        { id: "f", text: "Falso", isCorrect: false },
      ],
    };
    expect(gradeQuestion(q, "t")).toBe(1);
    expect(gradeQuestion(q, "f")).toBe(0);
  });

  it("requires an exact match for multiple_select", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "multiple_select",
      text: "",
      options: [
        { id: "a", text: "A", isCorrect: true },
        { id: "b", text: "B", isCorrect: true },
        { id: "c", text: "C", isCorrect: false },
      ],
    };
    expect(gradeQuestion(q, ["a", "b"])).toBe(1);
    expect(gradeQuestion(q, ["a"])).toBe(0);
    expect(gradeQuestion(q, ["a", "b", "c"])).toBe(0);
    expect(gradeQuestion(q, undefined)).toBe(0);
  });

  it("counts open_ended as correct only when non-blank", () => {
    const q: QuizQuestion = { id: "q1", type: "open_ended", text: "" };
    expect(gradeQuestion(q, "uma resposta")).toBe(1);
    expect(gradeQuestion(q, "   ")).toBe(0);
    expect(gradeQuestion(q, undefined)).toBe(0);
  });

  it("gives partial credit per matched pair on matching questions", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "matching",
      text: "",
      pairs: [
        { id: "p1", left: "Cão", right: "Late" },
        { id: "p2", left: "Gato", right: "Mia" },
        { id: "p3", left: "Vaca", right: "Muge" },
      ],
    };
    expect(gradeQuestion(q, { p1: "p1", p2: "p2", p3: "p3" })).toBe(1);
    expect(gradeQuestion(q, { p1: "p1", p2: "p3", p3: "p2" })).toBeCloseTo(1 / 3);
    expect(gradeQuestion(q, {})).toBe(0);
    expect(gradeQuestion(q, undefined)).toBe(0);
  });

  it("returns 0 for a matching question with no pairs (malformed/legacy data)", () => {
    const q: QuizQuestion = { id: "q1", type: "matching", text: "" };
    expect(gradeQuestion(q, { anything: "x" })).toBe(0);
  });

  it("grades fill_table as answered/not answered against minRows", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "fill_table",
      text: "",
      columns: [
        { id: "c1", header: "Título" },
        { id: "c2", header: "Objetivo" },
      ],
      minRows: 2,
    };
    expect(gradeQuestion(q, [{ c1: "Projeto A", c2: "Obj A" }])).toBe(0); // só 1 linha, precisa de 2
    expect(
      gradeQuestion(q, [
        { c1: "Projeto A", c2: "Obj A" },
        { c1: "Projeto B", c2: "" },
      ])
    ).toBe(1); // linha com pelo menos uma célula preenchida já conta
    expect(gradeQuestion(q, [])).toBe(0);
  });

  it("defaults fill_table minRows to 1", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "fill_table",
      text: "",
      columns: [{ id: "c1", header: "Título" }],
    };
    expect(gradeQuestion(q, [{ c1: "Algo" }])).toBe(1);
    expect(gradeQuestion(q, [{ c1: "" }])).toBe(0);
  });

  it("gives partial credit per correct blank, ignoring case/accent", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "fill_blank",
      text: "O {{1}} é a capital do {{2}}.",
      blanks: [
        { id: "b1", acceptedAnswers: ["Brasília"] },
        { id: "b2", acceptedAnswers: ["Brasil"] },
      ],
    };
    expect(gradeQuestion(q, { b1: "brasilia", b2: "BRASIL" })).toBe(1);
    expect(gradeQuestion(q, { b1: "brasilia", b2: "argentina" })).toBeCloseTo(0.5);
    expect(gradeQuestion(q, {})).toBe(0);
  });
});

describe("isQuestionAnswered", () => {
  it("requires every matching pair to have a selection", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "matching",
      text: "",
      pairs: [
        { id: "p1", left: "A", right: "1" },
        { id: "p2", left: "B", right: "2" },
      ],
    };
    expect(isQuestionAnswered(q, { p1: "p2" })).toBe(false);
    expect(isQuestionAnswered(q, { p1: "p2", p2: "p1" })).toBe(true);
  });

  it("requires minRows filled rows for fill_table", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "fill_table",
      text: "",
      columns: [{ id: "c1", header: "Título" }],
      minRows: 3,
    };
    expect(isQuestionAnswered(q, [{ c1: "a" }, { c1: "b" }])).toBe(false);
    expect(isQuestionAnswered(q, [{ c1: "a" }, { c1: "b" }, { c1: "c" }])).toBe(true);
  });

  it("requires every blank to be filled for fill_blank", () => {
    const q: QuizQuestion = {
      id: "q1",
      type: "fill_blank",
      text: "{{1}} e {{2}}",
      blanks: [{ id: "b1", acceptedAnswers: ["x"] }, { id: "b2", acceptedAnswers: ["y"] }],
    };
    expect(isQuestionAnswered(q, { b1: "x" })).toBe(false);
    expect(isQuestionAnswered(q, { b1: "x", b2: "y" })).toBe(true);
  });
});

describe("computeQuizScore", () => {
  it("auto-passes an empty quiz (pre-existing behavior)", () => {
    expect(computeQuizScore([], {}, 70)).toEqual({ score: 100, passed: true });
  });

  it("averages fractional per-question scores into a 0-100 score", () => {
    const questions: QuizQuestion[] = [
      {
        id: "q1",
        type: "multiple_choice",
        text: "",
        options: [{ id: "a", text: "A", isCorrect: true }],
      },
      {
        id: "q2",
        type: "matching",
        text: "",
        pairs: [
          { id: "p1", left: "A", right: "1" },
          { id: "p2", left: "B", right: "2" },
        ],
      },
    ];
    // q1 = 1 (correct), q2 = 0.5 (1 of 2 pairs correct) -> avg 0.75 -> 75%
    const result = computeQuizScore(questions, { q1: "a", q2: { p1: "p1", p2: "p1" } }, 70);
    expect(result).toEqual({ score: 75, passed: true });
  });
});
