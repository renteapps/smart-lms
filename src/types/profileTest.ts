export type ProfileCategory = {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex or tailwind color class
  description: string;
};

export type QuestionOption = {
  id: string;
  text: string;
  categoryScores: Record<string, number>; // categoryId -> points (e.g. { cat1: 3, cat2: 1 })
};

export type ProfileQuestion = {
  id: string;
  text: string;
  options: QuestionOption[];
};

export type ProfileTestStatus = 'draft' | 'published';

export type ProfileTest = {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  status: ProfileTestStatus;
  resultType?: 'single' | 'percentage';
  categories: ProfileCategory[];
  questions: ProfileQuestion[];
  createdAt: string;
  updatedAt: string;
  completionsCount?: number;
};
