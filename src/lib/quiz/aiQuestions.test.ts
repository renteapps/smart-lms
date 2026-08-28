import { describe, expect, it } from "vitest";
import {
  blocksToPlainText,
  budgetSourceTexts,
  buildQuizQuestionsPrompt,
  isLessonEligibleForAi,
  lessonSourceKinds,
  lessonSourceToText,
  normalizeGeneratedQuestions,
  stripTranscriptTimestamps,
} from "./aiQuestions";

describe("blocksToPlainText", () => {
  it("walks inline content and children", () => {
    const blocks = [
      { id: "1", type: "heading", props: {}, content: [{ type: "text", text: "Título" }] },
      {
        id: "2",
        type: "bulletListItem",
        props: {},
        content: [{ type: "text", text: "Primeiro" }],
        children: [{ id: "3", type: "paragraph", props: {}, content: [{ type: "text", text: "Aninhado" }] }],
      },
    ];
    expect(blocksToPlainText(blocks)).toBe("Título\nPrimeiro\nAninhado");
  });

  it("returns empty string for blocks without text", () => {
    expect(blocksToPlainText([{ id: "1", type: "image", props: { url: "x" } }])).toBe("");
    expect(blocksToPlainText(null)).toBe("");
    expect(blocksToPlainText(undefined)).toBe("");
  });
});

describe("stripTranscriptTimestamps", () => {
  it("removes the [HH:MM:SS] prefixes written by the PandaVideo import", () => {
    const raw = "[00:00:00] Bem-vindo ao curso\n[00:01:12] Vamos falar de escopo";
    expect(stripTranscriptTimestamps(raw)).toBe("Bem-vindo ao curso\nVamos falar de escopo");
  });

  it("also handles the short [MM:SS] form", () => {
    expect(stripTranscriptTimestamps("[01:12] Olá")).toBe("Olá");
  });
});

describe("lesson sources", () => {
  it("lists every available source, richest first", () => {
    expect(
      lessonSourceKinds({ id: "l1", title: "A", transcription: "t", content: "c", shortDescription: "s" }),
    ).toEqual(["transcription", "content", "shortDescription"]);
    expect(lessonSourceKinds({ id: "l2", title: "B", shortDescription: "s" })).toEqual(["shortDescription"]);
    expect(lessonSourceKinds({ id: "l3", title: "C" })).toEqual([]);
  });

  it("treats a lesson with only blocks as eligible", () => {
    const lesson = {
      id: "l4",
      title: "D",
      blocks: [{ id: "1", type: "paragraph", props: {}, content: [{ type: "text", text: "corpo" }] }],
    };
    expect(isLessonEligibleForAi(lesson)).toBe(true);
    expect(lessonSourceToText(lesson)).toBe("corpo");
  });

  it("uses shortDescription only when there is nothing richer", () => {
    expect(lessonSourceToText({ id: "l5", title: "E", transcription: "corpo", shortDescription: "resumo" })).toBe(
      "corpo",
    );
    expect(lessonSourceToText({ id: "l6", title: "F", shortDescription: "resumo" })).toBe("resumo");
  });
});

describe("budgetSourceTexts", () => {
  it("gives the leftover of short texts to the long ones", () => {
    const [short, long] = budgetSourceTexts(["abc", "x".repeat(100)], 50);
    expect(short).toBe("abc");
    expect(long).toHaveLength(47);
  });

  it("keeps everything when it all fits", () => {
    expect(budgetSourceTexts(["ab", "cd"], 100)).toEqual(["ab", "cd"]);
  });

  it("preserves positions of empty entries", () => {
    expect(budgetSourceTexts(["", "ok"], 100)).toEqual(["", "ok"]);
  });
});

describe("buildQuizQuestionsPrompt", () => {
  const base = {
    courseTitle: "Gestão de Projetos",
    lessons: [{ title: "Escopo", text: "O escopo define as fronteiras do projeto." }],
    count: 3,
  };

  it("carries the material, the count and the type-specific schema", () => {
    const prompt = buildQuizQuestionsPrompt({ ...base, type: "multiple_choice" });
    expect(prompt).toContain("O escopo define as fronteiras do projeto.");
    expect(prompt).toContain("### Aula: Escopo");
    expect(prompt).toContain("Quantidade: 3");
    expect(prompt).toContain("EXATAMENTE UMA");
    expect(prompt).toContain("array JSON válido");
  });

  it("changes the schema with the type", () => {
    expect(buildQuizQuestionsPrompt({ ...base, type: "fill_blank" })).toContain("{{1}}");
    expect(buildQuizQuestionsPrompt({ ...base, type: "matching" })).toContain('"pairs"');
  });

  it("includes the instructor's extra prompt only when given", () => {
    expect(buildQuizQuestionsPrompt({ ...base, type: "open_ended" })).not.toContain("Instruções específicas");
    const withExtra = buildQuizQuestionsPrompt({ ...base, type: "open_ended", extraPrompt: "  foque em riscos  " });
    expect(withExtra).toContain("Instruções específicas");
    expect(withExtra).toContain("foque em riscos");
  });
});

describe("normalizeGeneratedQuestions", () => {
  it("accepts a bare array, a { questions } wrapper and a single object", () => {
    const item = { text: "P?", options: [{ text: "a", isCorrect: true }, { text: "b" }] };
    expect(normalizeGeneratedQuestions([item], "multiple_choice", 5)).toHaveLength(1);
    expect(normalizeGeneratedQuestions({ questions: [item] }, "multiple_choice", 5)).toHaveLength(1);
    expect(normalizeGeneratedQuestions(item, "multiple_choice", 5)).toHaveLength(1);
    expect(normalizeGeneratedQuestions("nada disso", "multiple_choice", 5)).toEqual([]);
  });

  it("never returns more than the requested count", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      text: `P${i}`,
      options: [{ text: "a", isCorrect: true }, { text: "b" }],
    }));
    expect(normalizeGeneratedQuestions(items, "multiple_choice", 3)).toHaveLength(3);
  });

  it("gives every question and option a unique id", () => {
    const items = [
      { text: "P1", options: [{ text: "a", isCorrect: true }, { text: "b" }] },
      { text: "P2", options: [{ text: "a", isCorrect: true }, { text: "b" }] },
    ];
    const questions = normalizeGeneratedQuestions(items, "multiple_choice", 2);
    const ids = [...questions.map((q) => q.id), ...questions.flatMap((q) => q.options ?? []).map((o) => o.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe("multiple_choice", () => {
    it("keeps a single correct option when the model marks several", () => {
      const [question] = normalizeGeneratedQuestions(
        [
          {
            text: "Qual?",
            options: [
              { text: "A", isCorrect: true },
              { text: "B", isCorrect: true },
              { text: "C", isCorrect: false },
            ],
          },
        ],
        "multiple_choice",
        1,
      );
      expect(question.options?.filter((o) => o.isCorrect)).toHaveLength(1);
      expect(question.options?.find((o) => o.isCorrect)?.text).toBe("A");
    });

    it("recovers the answer key from correctIndex", () => {
      const [question] = normalizeGeneratedQuestions(
        [{ text: "Qual?", options: ["A", "B", "C"], correctIndex: 1 }],
        "multiple_choice",
        1,
      );
      expect(question.options?.find((o) => o.isCorrect)?.text).toBe("B");
    });

    it("recovers a 1-based index too", () => {
      const [question] = normalizeGeneratedQuestions(
        [{ text: "Qual?", options: ["A", "B", "C"], answer: 3 }],
        "multiple_choice",
        1,
      );
      expect(question.options?.find((o) => o.isCorrect)?.text).toBe("C");
    });

    it("recovers the answer key from the answer text, ignoring accents", () => {
      const [question] = normalizeGeneratedQuestions(
        [{ text: "Qual?", options: ["Análise", "Síntese"], correctAnswer: "analise" }],
        "multiple_choice",
        1,
      );
      expect(question.options?.find((o) => o.isCorrect)?.text).toBe("Análise");
    });

    it("drops a question with no usable answer key", () => {
      expect(
        normalizeGeneratedQuestions([{ text: "Qual?", options: ["A", "B"] }], "multiple_choice", 1),
      ).toEqual([]);
    });

    it("drops a question without a statement", () => {
      expect(
        normalizeGeneratedQuestions([{ options: [{ text: "A", isCorrect: true }, { text: "B" }] }], "multiple_choice", 1),
      ).toEqual([]);
    });
  });

  describe("multiple_select", () => {
    it("requires at least three options and two correct ones", () => {
      const ok = normalizeGeneratedQuestions(
        [
          {
            text: "Quais?",
            options: [
              { text: "A", isCorrect: true },
              { text: "B", isCorrect: true },
              { text: "C", isCorrect: false },
            ],
          },
        ],
        "multiple_select",
        1,
      );
      expect(ok).toHaveLength(1);

      const onlyOneCorrect = normalizeGeneratedQuestions(
        [{ text: "Quais?", options: [{ text: "A", isCorrect: true }, { text: "B" }, { text: "C" }] }],
        "multiple_select",
        1,
      );
      expect(onlyOneCorrect).toEqual([]);
    });

    it("drops a question where every option is correct", () => {
      expect(
        normalizeGeneratedQuestions(
          [
            {
              text: "Quais?",
              options: [
                { text: "A", isCorrect: true },
                { text: "B", isCorrect: true },
                { text: "C", isCorrect: true },
              ],
            },
          ],
          "multiple_select",
          1,
        ),
      ).toEqual([]);
    });
  });

  describe("true_false", () => {
    it("builds the Verdadeiro/Falso pair from a boolean answer", () => {
      const [question] = normalizeGeneratedQuestions([{ text: "O céu é azul.", answer: true }], "true_false", 1);
      expect(question.options?.map((o) => o.text)).toEqual(["Verdadeiro", "Falso"]);
      expect(question.options?.[0].isCorrect).toBe(true);
      expect(question.options?.[1].isCorrect).toBe(false);
    });

    it("understands the answer written in Portuguese", () => {
      const [question] = normalizeGeneratedQuestions([{ text: "Afirmação.", answer: "Falso" }], "true_false", 1);
      expect(question.options?.[1].isCorrect).toBe(true);
    });

    it("falls back to an options array", () => {
      const [question] = normalizeGeneratedQuestions(
        [{ text: "Afirmação.", options: [{ text: "Verdadeiro" }, { text: "Falso", isCorrect: true }] }],
        "true_false",
        1,
      );
      expect(question.options?.[1].isCorrect).toBe(true);
    });

    it("drops a question with no decidable answer", () => {
      expect(normalizeGeneratedQuestions([{ text: "Afirmação." }], "true_false", 1)).toEqual([]);
    });
  });

  describe("matching", () => {
    it("drops pairs whose right side repeats", () => {
      const [question] = normalizeGeneratedQuestions(
        [
          {
            text: "Associe",
            pairs: [
              { left: "A", right: "Um" },
              { left: "B", right: "um" },
              { left: "C", right: "Dois" },
            ],
          },
        ],
        "matching",
        1,
      );
      expect(question.pairs?.map((p) => p.left)).toEqual(["A", "C"]);
    });

    it("drops the question when fewer than two pairs survive", () => {
      expect(
        normalizeGeneratedQuestions([{ text: "Associe", pairs: [{ left: "A", right: "Um" }] }], "matching", 1),
      ).toEqual([]);
    });
  });

  describe("fill_table", () => {
    it("clamps minRows and accepts string columns", () => {
      const [question] = normalizeGeneratedQuestions(
        [{ text: "Preencha", columns: ["Etapa", "Responsável"], minRows: 0 }],
        "fill_table",
        1,
      );
      expect(question.columns?.map((c) => c.header)).toEqual(["Etapa", "Responsável"]);
      expect(question.minRows).toBe(1);
      expect(question.tableLayout).toBe("table");
    });

    it("switches to the stacked layout beyond three columns", () => {
      const [question] = normalizeGeneratedQuestions(
        [{ text: "Preencha", columns: ["A", "B", "C", "D"] }],
        "fill_table",
        1,
      );
      expect(question.tableLayout).toBe("stacked");
    });
  });

  describe("fill_blank", () => {
    it("renumbers out-of-order markers and pairs them with the blanks", () => {
      const [question] = normalizeGeneratedQuestions(
        [
          {
            text: "A capital é {{3}} no estado {{7}}.",
            blanks: [{ acceptedAnswers: ["Brasília"] }, { acceptedAnswers: ["Distrito Federal", "DF"] }],
          },
        ],
        "fill_blank",
        1,
      );
      expect(question.text).toBe("A capital é {{1}} no estado {{2}}.");
      expect(question.blanks).toHaveLength(2);
      expect(question.blanks?.[1].acceptedAnswers).toEqual(["Distrito Federal", "DF"]);
    });

    it("converts underscore gaps into markers", () => {
      const [question] = normalizeGeneratedQuestions(
        [{ text: "A capital é _____.", blanks: [{ answer: "Brasília" }] }],
        "fill_blank",
        1,
      );
      expect(question.text).toBe("A capital é {{1}}.");
      expect(question.blanks?.[0].acceptedAnswers).toEqual(["Brasília"]);
    });

    it("keeps a multiple-choice blank when exactly one option is correct", () => {
      const [question] = normalizeGeneratedQuestions(
        [
          {
            text: "A capital é {{1}}.",
            blanks: [{ options: [{ text: "Brasília", isCorrect: true }, { text: "Salvador" }] }],
          },
        ],
        "fill_blank",
        1,
      );
      expect(question.blanks?.[0].options).toHaveLength(2);
      expect(question.blanks?.[0].options?.find((o) => o.isCorrect)?.text).toBe("Brasília");
    });

    it("drops the question when a blank has no answer at all", () => {
      expect(
        normalizeGeneratedQuestions(
          [{ text: "A capital é {{1}} no estado {{2}}.", blanks: [{ acceptedAnswers: ["Brasília"] }] }],
          "fill_blank",
          1,
        ),
      ).toEqual([]);
    });

    it("drops the question when the template has no gap", () => {
      expect(
        normalizeGeneratedQuestions(
          [{ text: "Sem lacuna nenhuma.", blanks: [{ acceptedAnswers: ["x"] }] }],
          "fill_blank",
          1,
        ),
      ).toEqual([]);
    });
  });

  describe("open_ended", () => {
    it("keeps only the statement and the explanation", () => {
      const [question] = normalizeGeneratedQuestions(
        [{ question: "Explique o escopo.", feedback: "Espera-se citar fronteiras." }],
        "open_ended",
        1,
      );
      expect(question.text).toBe("Explique o escopo.");
      expect(question.explanation).toBe("Espera-se citar fronteiras.");
      expect(question.options).toBeUndefined();
    });
  });
});
