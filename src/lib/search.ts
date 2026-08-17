import { AGENTS } from "@/lib/seed/agents";
import { CATALOG_COURSES } from "@/lib/catalog";
import { MOCK_COURSE } from "@/lib/mockData";
import type {
  SearchFilterOptions,
  SearchResponse,
  SearchResultItem,
  SearchResultType,
  SearchTabType,
} from "@/types/search";

export function normalizeSearchText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Extrai um snippet ao redor do termo encontrado */
export function extractSnippet(
  text: string,
  query: string,
  maxLength: number = 140,
): string {
  if (!text) return "";
  const normText = normalizeSearchText(text);
  const normQuery = normalizeSearchText(query);

  if (!normQuery) {
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
  }

  const index = normText.indexOf(normQuery);
  if (index === -1) {
    // Tenta pelo primeiro token
    const firstToken = normQuery.split(/\s+/)[0];
    const tokenIndex = firstToken ? normText.indexOf(firstToken) : -1;
    if (tokenIndex === -1) {
      return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
    }
    const start = Math.max(0, tokenIndex - 35);
    const end = Math.min(text.length, start + maxLength);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < text.length ? "..." : "";
    return `${prefix}${text.slice(start, end).trim()}${suffix}`;
  }

  const start = Math.max(0, index - 35);
  const end = Math.min(text.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

// Fallback estático para artigos do blog
const STATIC_ARTICLES = [
  {
    slug: "primeiro-artigo",
    title: "O que trava sua promoção quase nunca é técnica",
    excerpt:
      "Descubra por que as soft skills são o verdadeiro diferencial na hora de dar o próximo passo na carreira e como desenvolvê-las.",
    category: "Carreira",
    author: "Nohan",
    readingTime: 6,
    format: "both",
    hasAudio: true,
    cover:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2940&auto=format&fit=crop",
    body: "Muitos profissionais acreditam que a chave para a próxima promoção é fazer mais um curso técnico, tirar mais uma certificação ou dominar a ferramenta do momento. E embora a técnica seja o seu ingresso para entrar no jogo, são as soft skills que ditam se você vai liderá-lo. Liderança, negociação de prazos, escuta ativa e comunicação interpessoal.",
    publishedAt: "2026-06-10T12:00:00Z",
  },
  {
    slug: "pratica-deliberada",
    title: "Prática deliberada: como aprender fazendo",
    excerpt:
      "Use sessões curtas, feedback e repetição intencional para transformar conteúdo em habilidade.",
    category: "Aprendizagem",
    author: "Equipe Smart LMS",
    readingTime: 10,
    format: "text",
    hasAudio: false,
    cover:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1400&auto=format&fit=crop",
    body: "Consumir conteúdo é apenas o começo. A prática deliberada transforma uma ideia em habilidade ao combinar tentativa, observação e ajuste. Escolha uma habilidade por vez, crie um ciclo curto de feedback e use o erro como informação.",
    publishedAt: "2026-08-01T10:00:00Z",
  },
  {
    slug: "rotina-aprendizagem",
    title: "Construindo uma rotina de aprendizagem que cabe na semana",
    excerpt:
      "Como encaixar o desenvolvimento contínuo sem comprometer sua entrega diária e sem sobrecarga.",
    category: "Produtividade",
    author: "Equipe Smart LMS",
    readingTime: 7,
    format: "text",
    hasAudio: false,
    cover:
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=85&w=1200&auto=format&fit=crop",
    body: "Aprender não exige parar a vida por meses. Com micro-hábitos diários de 15 minutos e aplicação no mesmo dia, sua retenção sobe exponencialmente e os resultados aparecem nas conversas reais de trabalho.",
    publishedAt: "2026-08-05T09:00:00Z",
  },
];

interface RawSearchCandidate {
  id: string;
  type: SearchResultType;
  title: string;
  description: string;
  category: string;
  url: string;
  body?: string;
  tags?: string[];
  skills?: string[];
  metadata?: SearchResultItem["metadata"];
}

/** Carrega os dados indexáveis de todas as fontes */
export function getStaticCandidates(localNotes?: SearchFilterOptions["localNotes"]): RawSearchCandidate[] {
  const candidates: RawSearchCandidate[] = [];

  // 1. AULAS E CURSOS
  // Aulas do MOCK_COURSE
  MOCK_COURSE.modules.forEach((mod) => {
    mod.lessons.forEach((lesson) => {
      const blockTexts = (lesson.blocks || []).map((b) => b.content).join(" ");
      candidates.push({
        id: `lesson-${lesson.id}`,
        type: "lesson",
        title: lesson.title,
        description: lesson.content || `Aula prática do módulo ${mod.title}`,
        category: mod.title.split(":")[0]?.trim() || "Comunicação",
        url: `/courses/c1/lessons/${lesson.id}`,
        body: blockTexts,
        tags: [mod.title, lesson.type],
        metadata: {
          courseId: "c1",
          courseTitle: MOCK_COURSE.title,
          moduleId: mod.id,
          moduleTitle: mod.title,
          duration: `${lesson.durationInMinutes || 10} min`,
          lessonType: lesson.type,
          cover: mod.coverUrl || "https://images.unsplash.com/photo-1552664730-d307ca884978?q=85&w=1200&auto=format&fit=crop",
        },
      });
    });
  });

  // Aulas adicionais do catálogo
  CATALOG_COURSES.forEach((course) => {
    // Adiciona o curso como ponto de aprendizagem
    candidates.push({
      id: `course-${course.id}`,
      type: "lesson",
      title: course.title,
      description: course.description,
      category: course.category,
      url: `/courses/${course.id}`,
      tags: [course.category, course.level],
      metadata: {
        courseId: course.id,
        courseTitle: course.title,
        duration: course.duration,
        cover: course.cover,
      },
    });
  });

  // 2. AGENTES DE IA
  AGENTS.forEach((agent) => {
    const startersText = agent.starters.map((s) => `${s.label} ${s.message}`).join(" ");
    const repliesText = agent.replies.map((r) => `${r.keywords.join(" ")} ${r.text}`).join(" ");
    const coursesText = [agent.courseTitle, ...(agent.courseTitles || [])].filter(Boolean).join(" ");
    const plansText = (agent.planNames || []).filter(Boolean).join(" ");

    candidates.push({
      id: `agent-${agent.id}`,
      type: "agent",
      title: agent.name,
      description: `${agent.role} · ${agent.description}${coursesText ? ` · ${coursesText}` : ""}`,
      category: agent.category || "Agentes",
      url: `/agentes/${agent.slug}`,
      body: `${agent.greeting} ${startersText} ${repliesText} ${coursesText} ${plansText}`,
      skills: agent.skills,
      tags: [
        agent.category,
        agent.role,
        ...(agent.skills || []),
        ...(agent.courseTitles || []),
        ...(agent.planNames || []),
      ].filter(Boolean),
      metadata: {
        avatar: agent.avatar,
        role: agent.role,
        skills: agent.skills,
        agentStatus: agent.status,
        rating: agent.rating,
      },
    });
  });

  // 3. ARTIGOS DO BLOG
  STATIC_ARTICLES.forEach((article) => {
    candidates.push({
      id: `article-${article.slug}`,
      type: "article",
      title: article.title,
      description: article.excerpt,
      category: article.category,
      url: `/blog/${article.slug}`,
      body: article.body,
      tags: [article.category, article.author],
      metadata: {
        author: article.author,
        readingTime: article.readingTime,
        hasAudio: article.hasAudio,
        cover: article.cover,
        updatedAt: article.publishedAt,
      },
    });
  });

  // 4. ANOTAÇÕES DO USUÁRIO
  if (localNotes && localNotes.length > 0) {
    localNotes.forEach((note) => {
      const isAgent = note.lessonId.startsWith("agente-");
      const isPersonal = note.lessonId.startsWith("pessoal-");

      let noteUrl = "/notas";
      if (!isPersonal && !isAgent) {
        noteUrl = `/courses/c1/lessons/${note.lessonId}`;
      } else if (isAgent) {
        noteUrl = "/agentes";
      }

      candidates.push({
        id: `note-${note.lessonId}`,
        type: "note",
        title: note.lessonTitle || "Anotação sem título",
        description: note.content,
        category: "Minhas Anotações",
        url: noteUrl,
        body: note.content,
        tags: note.tags || [],
        metadata: {
          tags: note.tags || [],
          pinned: note.pinned || false,
          updatedAt: note.updatedAt,
          noteKind: isAgent ? "agent" : isPersonal ? "personal" : "lesson",
        },
      });
    });
  }

  return candidates;
}

/** Calcula pontuação de relevância de um candidato em relação à consulta */
export function scoreCandidate(
  candidate: RawSearchCandidate,
  query: string,
  tokens: string[],
): number {
  if (!query) return 10; // Sem busca, relevância neutra

  const normQuery = normalizeSearchText(query);
  const normTitle = normalizeSearchText(candidate.title);
  const normDesc = normalizeSearchText(candidate.description);
  const normCat = normalizeSearchText(candidate.category);
  const normBody = normalizeSearchText(candidate.body || "");
  const normTags = (candidate.tags || []).map(normalizeSearchText);
  const normSkills = (candidate.skills || []).map(normalizeSearchText);

  let score = 0;

  // 1. Casamento exato ou frase inteira no título (+120 / +80)
  if (normTitle === normQuery) {
    score += 150;
  } else if (normTitle.includes(normQuery)) {
    score += 90;
  }

  // 2. Frase inteira na categoria, tags ou habilidades (+50)
  if (normCat.includes(normQuery)) {
    score += 45;
  }
  if (normTags.some((t) => t.includes(normQuery)) || normSkills.some((s) => s.includes(normQuery))) {
    score += 55;
  }

  // 3. Frase inteira na descrição (+35)
  if (normDesc.includes(normQuery)) {
    score += 35;
  }

  // 4. Casamento token por token
  let matchedTokens = 0;
  for (const token of tokens) {
    let tokenMatched = false;

    // Título
    if (normTitle.includes(token)) {
      score += 30;
      tokenMatched = true;
    }

    // Categoria / Tags / Skills
    if (normCat.includes(token)) {
      score += 20;
      tokenMatched = true;
    }
    if (normTags.some((t) => t.includes(token)) || normSkills.some((s) => s.includes(token))) {
      score += 25;
      tokenMatched = true;
    }

    // Descrição
    if (normDesc.includes(token)) {
      score += 15;
      tokenMatched = true;
    }

    // Corpo do texto
    if (normBody.includes(token)) {
      score += 6;
      tokenMatched = true;
    }

    if (tokenMatched) {
      matchedTokens++;
    }
  }

  // Se a consulta possui múltiplos termos e nenhum casou, descarte
  if (tokens.length > 0 && matchedTokens === 0) {
    return 0;
  }

  // Bônus de cobertura (se casou todos os termos da busca)
  if (tokens.length > 1 && matchedTokens === tokens.length) {
    score += 30;
  }

  // Bônus específicos de metadados
  if (candidate.metadata?.pinned) {
    score += 10;
  }
  if (candidate.metadata?.rating && candidate.metadata.rating > 4.5) {
    score += 5;
  }

  return score;
}

/** Motor principal de busca unificada */
export function executeUnifiedSearch(
  options: SearchFilterOptions,
  customCandidates?: RawSearchCandidate[],
): SearchResponse {
  const { query = "", type = "all", category, sortBy = "relevance", localNotes } = options;
  const trimmedQuery = query.trim();
  const tokens = normalizeSearchText(trimmedQuery)
    .split(/\s+/)
    .filter(Boolean);

  const rawCandidates = customCandidates || getStaticCandidates(localNotes);

  // Calcula contadores de todas as categorias/tipos com o termo de busca atual
  const countsByType = {
    all: 0,
    lesson: 0,
    agent: 0,
    article: 0,
    note: 0,
  };

  const scoredItems: SearchResultItem[] = [];
  const uniqueCategories = new Set<string>();

  for (const candidate of rawCandidates) {
    const score = scoreCandidate(candidate, trimmedQuery, tokens);
    if (trimmedQuery && score <= 0) continue;

    // Coleta categorias presentes nos resultados válidos
    if (candidate.category && candidate.category !== "Minhas Anotações") {
      uniqueCategories.add(candidate.category);
    }

    // Incrementa contadores
    countsByType.all += 1;
    if (candidate.type in countsByType) {
      countsByType[candidate.type as SearchResultType] += 1;
    }

    // Aplica filtro de aba (tipo)
    if (type !== "all" && candidate.type !== type) {
      continue;
    }

    // Aplica filtro de categoria se selecionado
    if (category && category !== "Todas" && candidate.category !== category) {
      continue;
    }

    // Formata o item de resultado com snippets
    const snippetDesc = candidate.description
      ? extractSnippet(candidate.description, trimmedQuery, 140)
      : "";

    scoredItems.push({
      id: candidate.id,
      type: candidate.type,
      title: candidate.title,
      description: snippetDesc,
      category: candidate.category,
      url: candidate.url,
      score,
      metadata: candidate.metadata,
    });
  }

  // Ordenação
  if (sortBy === "az") {
    scoredItems.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  } else if (sortBy === "recent") {
    scoredItems.sort((a, b) => {
      const dateA = a.metadata?.updatedAt ? new Date(a.metadata.updatedAt).getTime() : 0;
      const dateB = b.metadata?.updatedAt ? new Date(b.metadata.updatedAt).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return (b.score || 0) - (a.score || 0);
    });
  } else {
    // relevance
    scoredItems.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  return {
    query: trimmedQuery,
    items: scoredItems,
    totalCount: scoredItems.length,
    countsByType,
    categories: ["Todas", ...Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b, "pt-BR"))],
  };
}
