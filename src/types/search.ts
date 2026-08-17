export type SearchResultType = "lesson" | "agent" | "article" | "note";

export type SearchTabType = "all" | SearchResultType;

export interface SearchResultMetadata {
  // Aulas e Cursos
  courseId?: string;
  courseTitle?: string;
  moduleId?: string;
  moduleTitle?: string;
  duration?: string | number;
  lessonType?: "video" | "text" | "quiz" | "profile_test";

  // Agentes
  avatar?: string;
  role?: string;
  skills?: string[];
  agentStatus?: string;
  rating?: number;

  // Blog
  author?: string;
  readingTime?: number;
  hasAudio?: boolean;
  cover?: string;

  // Anotações
  tags?: string[];
  pinned?: boolean;
  updatedAt?: string;
  noteKind?: "lesson" | "agent" | "personal";
}

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  description: string;
  category?: string;
  url: string;
  score?: number;
  metadata?: SearchResultMetadata;
  highlights?: {
    title?: string;
    description?: string;
  };
}

export type SearchSortOption = "relevance" | "recent" | "az";

export interface SearchFilterOptions {
  query: string;
  type?: SearchTabType;
  category?: string;
  sortBy?: SearchSortOption;
  userId?: string;
  localNotes?: Array<{
    lessonId: string;
    lessonTitle: string;
    content: string;
    updatedAt: string;
    pinned?: boolean;
    tags?: string[];
  }>;
}

export interface SearchResponse {
  query: string;
  items: SearchResultItem[];
  totalCount: number;
  countsByType: {
    all: number;
    lesson: number;
    agent: number;
    article: number;
    note: number;
  };
  categories: string[];
}
