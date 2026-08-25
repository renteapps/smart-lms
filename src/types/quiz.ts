export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'multiple_select'
  | 'open_ended'
  | 'matching'
  | 'fill_table'
  | 'fill_blank';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean; // For multiple choice, true/false, multiple select
}

// Um par "esquerda -> direita" para perguntas de relação. `right` é o texto
// mostrado como opção no dropdown; a resposta certa para esse par é o próprio
// `id` (auto-referente), então duas opções com `right` igual não ambiguam a correção.
export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

// Cabeçalho de coluna para perguntas "preencher tabela".
export interface TableColumn {
  id: string;
  header: string;
}

// Uma lacuna de "preencher lacunas". Corresponde ao marcador {{n}} dentro de
// QuizQuestion.text (o texto funciona como o template da lacuna).
export interface FillBlankDef {
  id: string;
  acceptedAnswers: string[];
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string; // Para fill_blank, é o template com marcadores {{1}}, {{2}}...
  options?: QuizOption[]; // multiple_choice / true_false / multiple_select
  pairs?: MatchingPair[]; // matching
  columns?: TableColumn[]; // fill_table
  minRows?: number; // fill_table — quantidade mínima de linhas preenchidas (default 1)
  blanks?: FillBlankDef[]; // fill_blank
  explanation?: string; // Shown after answering
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number;
  createdAt?: string;
  updatedAt?: string;
}

// answers[questionId] shapes por tipo:
//  multiple_choice / true_false -> string (id da opção)
//  multiple_select               -> string[] (ids das opções)
//  open_ended                    -> string
//  matching                      -> Record<leftPairId, rightPairId>
//  fill_table                    -> Array<Record<columnId, string>>
//  fill_blank                    -> Record<blankId, string>
export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  lessonId: string;
  score: number;
  answers: Record<string, unknown>;
  passed: boolean;
  createdAt?: string;
}
