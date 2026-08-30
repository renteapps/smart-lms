import type {
  ContentSource,
  PageDocument,
  PageKey,
  PageSection,
  SectionStyle,
  SystemPageKey,
} from "@/types/pageBuilder";

export const SYSTEM_PAGE_KEYS: SystemPageKey[] = ["public-home", "no-products"];

export const SYSTEM_PAGE_LABELS: Record<SystemPageKey, { title: string; description: string }> = {
  "public-home": {
    title: "Home Pública",
    description: "Página inicial exibida para visitantes que ainda não entraram na plataforma.",
  },
  "no-products": {
    title: "Usuário Sem Produtos",
    description: "Vitrine exibida para usuários logados sem curso ou plano ativo.",
  },
};

export function isSystemPageKey(value: string): value is SystemPageKey {
  return SYSTEM_PAGE_KEYS.includes(value as SystemPageKey);
}

/**
 * Segmentos de topo já ocupados em `src/app` (mais os 2 slugs de sistema) —
 * uma página nova não pode usar um destes como slug. `/pagina/[slug]` é um
 * segmento diferente do slug em si, então uma colisão de URL de verdade não
 * é possível hoje; a lista existe para manter o admin livre de nomes
 * confusos e como proteção caso páginas custom um dia passem a viver na
 * raiz.
 */
export const RESERVED_PAGE_SLUGS = new Set([
  "acessar", "actions", "admin", "agentes", "analises", "api", "auth", "blog",
  "busca", "certificados", "completar-cadastro", "confirmar", "courses",
  "criar-conta", "cursos", "diagnostico", "empresa", "markdown-preview",
  "minha-trilha", "notas", "onboarding", "pagina", "perfil", "resetar-senha",
  ...SYSTEM_PAGE_KEYS,
]);

export function isReservedPageSlug(slug: string): boolean {
  return RESERVED_PAGE_SLUGS.has(slug);
}

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidPageSlugFormat(value: string): boolean {
  return value.length >= 1 && value.length <= 80 && SLUG_FORMAT.test(value);
}

/** Mesma receita usada em `slugifyAgentName` e nas telas de admin (blog, planos, categorias). */
export function slugify(value: string): string {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export const DEFAULT_SECTION_STYLE: SectionStyle = {
  background: "default",
  width: "normal",
  spacing: "normal",
  alignment: "left",
};

export const DEFAULT_CONTENT_SOURCE: ContentSource = {
  mode: "automatic",
  itemIds: [],
  rule: "all",
  limit: 6,
};

function id(prefix: string) {
  return `default-${prefix}`;
}

export const DEFAULT_PAGE_DOCUMENTS: Record<SystemPageKey, PageDocument> = {
  "public-home": {
    version: 1,
    pageKey: "public-home",
    sections: [
      {
        id: id("public-hero"),
        type: "hero",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE, alignment: "center", spacing: "spacious" },
        eyebrow: "Educação moldada para você",
        title: "Cada jornada é única. A sua também deve ser.",
        text: "Aprenda com especialistas em uma experiência organizada para o seu próximo passo profissional.",
        ctas: [
          { label: "Criar minha conta", href: "/criar-conta", variant: "primary" },
          { label: "Acessar plataforma", href: "/acessar", variant: "secondary" },
        ],
      },
      {
        id: id("public-courses"),
        type: "course-carousel",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE, background: "muted" },
        eyebrow: "Cursos em destaque",
        title: "Conhecimento para colocar em prática",
        text: "Escolha o próximo passo da sua jornada.",
        source: { ...DEFAULT_CONTENT_SOURCE, rule: "featured", limit: 6 },
      },
      {
        id: id("public-tests"),
        type: "profile-test-carousel",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE },
        eyebrow: "Autoconhecimento",
        title: "Descubra seu perfil",
        text: "Testes rápidos para entender seus pontos fortes e próximos desafios.",
        source: { ...DEFAULT_CONTENT_SOURCE, rule: "recent", limit: 4 },
      },
      {
        id: id("public-articles"),
        type: "article-carousel",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE, background: "muted" },
        eyebrow: "Conteúdo aberto",
        title: "Ideias para levar com você",
        source: { ...DEFAULT_CONTENT_SOURCE, rule: "recent", limit: 4 },
      },
      {
        id: id("public-cta"),
        type: "text-cta",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE, background: "accent", alignment: "center", spacing: "spacious" },
        title: "Pronto para dar o próximo passo?",
        text: "Crie sua conta e encontre a jornada certa para o seu momento.",
        cta: { label: "Começar agora", href: "/criar-conta", variant: "primary" },
      },
    ],
  },
  "no-products": {
    version: 1,
    pageKey: "no-products",
    sections: [
      {
        id: id("products-hero"),
        type: "hero",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE, alignment: "center", spacing: "spacious" },
        eyebrow: "Sua próxima jornada começa aqui",
        title: "Escolha o conhecimento que vai levar você adiante.",
        text: "Explore cursos, experiências e conteúdos antes de decidir qual caminho combina com você.",
        ctas: [{ label: "Ver cursos", href: "#cursos-disponiveis", variant: "primary" }],
      },
      {
        id: "cursos-disponiveis",
        type: "course-carousel",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE, background: "muted" },
        eyebrow: "Catálogo",
        title: "Cursos disponíveis",
        text: "Conheça as formações e escolha onde começar.",
        source: { ...DEFAULT_CONTENT_SOURCE, rule: "all", limit: 8 },
      },
      {
        id: id("products-gallery"),
        type: "gallery-course-carousel",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE },
        eyebrow: "Veja por dentro",
        title: "Experimente o formato das nossas aulas",
        source: { ...DEFAULT_CONTENT_SOURCE, rule: "all", limit: 4 },
      },
      {
        id: id("products-tests"),
        type: "profile-test-carousel",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE, background: "muted" },
        eyebrow: "Comece por você",
        title: "Testes de perfil",
        source: { ...DEFAULT_CONTENT_SOURCE, rule: "recent", limit: 4 },
      },
      {
        id: id("products-articles"),
        type: "article-carousel",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE },
        eyebrow: "Para continuar pensando",
        title: "Artigos recentes",
        source: { ...DEFAULT_CONTENT_SOURCE, rule: "recent", limit: 4 },
      },
      {
        id: id("products-cta"),
        type: "text-cta",
        visible: true,
        style: { ...DEFAULT_SECTION_STYLE, background: "accent", alignment: "center" },
        title: "Ainda não sabe qual curso escolher?",
        text: "Explore o catálogo e abra cada curso para conhecer a proposta completa.",
        cta: { label: "Explorar catálogo", href: "/cursos", variant: "primary" },
      },
    ],
  },
};

const sectionTypes = new Set<PageSection["type"]>([
  "hero",
  "text-cta",
  "video",
  "image-gallery",
  "course-carousel",
  "gallery-course-carousel",
  "article-carousel",
  "profile-test-carousel",
]);
const backgrounds = new Set(["default", "muted", "accent", "dark"]);
const widths = new Set(["narrow", "normal", "wide"]);
const spacings = new Set(["compact", "normal", "spacious"]);
const alignments = new Set(["left", "center"]);
const providers = new Set(["youtube", "panda", "direct"]);
const sourceRules = new Set(["all", "featured", "recent", "category"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validText(value: unknown, max: number, required = false) {
  return typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);
}

export function isSafePageUrl(value: string): boolean {
  if (value.startsWith("/") || value.startsWith("#")) return !value.startsWith("//");
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function validateStyle(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return backgrounds.has(String(value.background))
    && widths.has(String(value.width))
    && spacings.has(String(value.spacing))
    && alignments.has(String(value.alignment));
}

function validateCta(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return validText(value.label, 80, true)
    && typeof value.href === "string"
    && value.href.length <= 500
    && isSafePageUrl(value.href)
    && (value.variant === "primary" || value.variant === "secondary");
}

function validateSource(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (value.mode === "manual" || value.mode === "automatic")
    && Array.isArray(value.itemIds)
    && value.itemIds.length <= 50
    && value.itemIds.every((item) => typeof item === "string" && item.length > 0 && item.length <= 160)
    && sourceRules.has(String(value.rule))
    && (value.category === undefined || validText(value.category, 100))
    && Number.isInteger(value.limit)
    && Number(value.limit) >= 1
    && Number(value.limit) <= 20;
}

function validateSection(value: unknown): boolean {
  if (!isRecord(value) || !sectionTypes.has(value.type as PageSection["type"])) return false;
  if (!validText(value.id, 120, true) || typeof value.visible !== "boolean" || !validateStyle(value.style)) return false;
  const type = value.type as PageSection["type"];
  if (type === "hero") {
    const media = value.media;
    return validText(value.title, 180, true) && validText(value.text, 1200, true)
      && (value.eyebrow === undefined || validText(value.eyebrow, 100))
      && Array.isArray(value.ctas) && value.ctas.length <= 2 && value.ctas.every(validateCta)
      && (media === undefined || (isRecord(media)
        && (media.type === "image" || media.type === "video")
        && validText(media.url, 1000, true) && isSafePageUrl(String(media.url))
        && (media.provider === undefined || providers.has(String(media.provider)))));
  }
  if (type === "text-cta") {
    return validText(value.title, 180, true) && validText(value.text, 4000, true)
      && (value.eyebrow === undefined || validText(value.eyebrow, 100))
      && (value.cta === undefined || validateCta(value.cta));
  }
  if (type === "video") {
    return validText(value.title, 180, true) && (value.text === undefined || validText(value.text, 1200))
      && providers.has(String(value.provider)) && validText(value.url, 1000, true) && isSafePageUrl(String(value.url));
  }
  if (type === "image-gallery") {
    return validText(value.title, 180, true) && Array.isArray(value.images) && value.images.length <= 20
      && value.images.every((image) => isRecord(image) && validText(image.id, 120, true)
        && validText(image.url, 1000, true) && isSafePageUrl(String(image.url)) && validText(image.alt, 240));
  }
  return validText(value.title, 180, true)
    && (value.text === undefined || validText(value.text, 1200))
    && validateSource(value.source);
}

export type PageValidationResult =
  | { success: true; document: PageDocument }
  | { success: false; error: string };

export function validatePageDocument(value: unknown, expectedKey?: PageKey): PageValidationResult {
  // `pageKey` só precisa ter formato de slug válido aqui — não dá mais para
  // checar contra uma lista fechada agora que páginas custom existem. A
  // existência real da página (ela está mesmo cadastrada em `pages`?) é
  // garantida pela FK de `page_builder_drafts.page_key`, não por este
  // validador de formato de documento.
  if (!isRecord(value) || value.version !== 1 || !validText(value.pageKey, 80, true)) {
    return { success: false, error: "Documento de página inválido." };
  }
  if (expectedKey && value.pageKey !== expectedKey) {
    return { success: false, error: "A página do documento não corresponde à página editada." };
  }
  if (!Array.isArray(value.sections) || value.sections.length > 40 || !value.sections.every(validateSection)) {
    return { success: false, error: "Uma ou mais seções possuem dados inválidos." };
  }
  const ids = value.sections.map((section) => (section as Record<string, unknown>).id);
  if (new Set(ids).size !== ids.length) return { success: false, error: "Cada seção precisa ter um identificador único." };
  return { success: true, document: value as PageDocument };
}

/** Documento inicial de uma página custom recém-criada: só um hero, para dar um ponto de partida sem ser uma tela em branco. */
export function createEmptyPageDocument(pageKey: string): PageDocument {
  return { version: 1, pageKey, sections: [createSection("hero")] };
}

export function cloneDefaultPage(key: PageKey): PageDocument {
  return isSystemPageKey(key) ? structuredClone(DEFAULT_PAGE_DOCUMENTS[key]) : createEmptyPageDocument(key);
}

export function createSection(type: PageSection["type"]): PageSection {
  const sectionId = `${type}-${crypto.randomUUID()}`;
  const base = { id: sectionId, visible: true, style: { ...DEFAULT_SECTION_STYLE } };
  if (type === "hero") return { ...base, type, title: "Novo destaque", text: "Escreva aqui a mensagem principal.", ctas: [] };
  if (type === "text-cta") return { ...base, type, title: "Nova seção", text: "Escreva aqui o conteúdo da seção." };
  if (type === "video") return { ...base, type, title: "Novo vídeo", provider: "youtube", url: "https://www.youtube.com/watch?v=" };
  if (type === "image-gallery") return { ...base, type, title: "Nova galeria", images: [] };
  return { ...base, type, title: "Nova seção", source: { ...DEFAULT_CONTENT_SOURCE } } as PageSection;
}

export function selectPageItems<T>(
  items: T[],
  source: ContentSource,
  helpers: {
    id: (item: T) => string;
    featured?: (item: T) => boolean;
    category?: (item: T) => string | undefined;
    /** Data de referência para a regra "Mais recentes". Sem ela, a regra não reordena (mesmo comportamento de antes). */
    date?: (item: T) => string | number | undefined | null;
  },
): T[] {
  if (source.mode === "manual") {
    const byId = new Map(items.map((item) => [helpers.id(item), item]));
    return source.itemIds.flatMap((itemId) => {
      const item = byId.get(itemId);
      return item ? [item] : [];
    }).slice(0, source.limit);
  }
  let filtered = source.rule === "featured" && helpers.featured
    ? items.filter(helpers.featured)
    : source.rule === "category" && source.category && helpers.category
      ? items.filter((item) => helpers.category?.(item) === source.category)
      : items;

  if (source.rule === "recent" && helpers.date) {
    const time = (item: T) => {
      const value = helpers.date!(item);
      if (value === undefined || value === null || value === "") return -Infinity;
      const numeric = typeof value === "number" ? value : new Date(value).getTime();
      return Number.isNaN(numeric) ? -Infinity : numeric;
    };
    filtered = [...filtered].sort((a, b) => time(b) - time(a));
  }

  return filtered.slice(0, source.limit);
}
