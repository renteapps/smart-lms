export type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_select' | 'open_ended';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean; // For multiple choice, true/false, multiple select
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options?: QuizOption[]; // Not needed for open_ended
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

export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  lessonId: string;
  score: number;
  answers: Record<string, unknown>; // questionId -> answer(s)
  passed: boolean;
  createdAt?: string;
}
