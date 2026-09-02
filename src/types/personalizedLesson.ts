import type { AssistantAvatarType, AssistantIconKey } from "@/types/platformAssistant";

export type PersonalizedQuestionType = "short_text" | "long_text" | "single" | "multiple";

export type PersonalizedLessonQuestion = {
  id: string;
  key: string;
  label: string;
  type: PersonalizedQuestionType;
  required: boolean;
  options: string[];
  order: number;
};

export type PersonalizedVariableSource = "profile" | "onboarding" | "profile_test" | "collected";

export type PersonalizedVariableBinding = {
  key: string;
  label: string;
  source: PersonalizedVariableSource;
  sourceRef: string;
};

export type PersonalizedSourceKind = "course" | "module" | "lesson" | "article";

export type PersonalizedSourceRef = {
  kind: PersonalizedSourceKind;
  id: string;
  title: string;
};

export type PersonalizedAssistantIdentity = {
  displayName: string;
  avatarType: AssistantAvatarType;
  iconKey: AssistantIconKey;
  avatarUrl?: string;
  primaryColor: string;
};

export type PersonalizedLessonConfig = {
  lessonId: string;
  promptTemplate: string;
  context: string;
  model: string;
  questions: PersonalizedLessonQuestion[];
  variableBindings: PersonalizedVariableBinding[];
  sourceRefs: PersonalizedSourceRef[];
  revision: number;
  updatedAt?: string;
};

export type PersonalizedLessonDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: "processing" | "ready" | "failed";
  errorMessage?: string;
  createdAt: string;
};

export type PersonalizedGenerationPublic = {
  id: string;
  version: number;
  contentMarkdown: string;
  creditsCharged: number;
  model: string;
  createdAt: string;
  finishedAt: string;
};

export type PersonalizedLessonStudentState = {
  questions: PersonalizedLessonQuestion[];
  savedAnswers: Record<string, string | string[]>;
  generation: PersonalizedGenerationPublic | null;
  outdated: boolean;
  assistant: PersonalizedAssistantIdentity;
};

export type PersonalizedLessonQuote = {
  availableCredits: number;
  maximumCredits: number;
  maxOutputTokens: number;
  assistant: PersonalizedAssistantIdentity;
};

export type PersonalizedLessonGenerateResult = {
  generation: PersonalizedGenerationPublic;
  creditsRemaining: number;
  refundedCredits: number;
  assistant: PersonalizedAssistantIdentity;
};

export type PersonalizedAdminVariableOption = PersonalizedVariableBinding & {
  groupLabel: string;
};

export type PersonalizedAdminSourceOption = PersonalizedSourceRef & {
  groupLabel: string;
};

export type PersonalizedLessonAdminData = {
  config: PersonalizedLessonConfig | null;
  documents: PersonalizedLessonDocument[];
  assistant: PersonalizedAssistantIdentity;
  models: Array<{ id: string; name: string }>;
  variableOptions: PersonalizedAdminVariableOption[];
  sourceOptions: PersonalizedAdminSourceOption[];
};
