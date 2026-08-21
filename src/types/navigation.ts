/**
 * Configuração do menu principal e do rodapé do aluno.
 *
 * O ícone atravessa o banco como string (`NavIconKey`) e só vira componente na
 * borda de render — mesmo contrato já usado pelo assistente da plataforma em
 * `src/types/platformAssistant.ts`. Guardar a referência do componente seria
 * impossível: JSONB não serializa função.
 */

export const NAV_ICON_KEYS = [
  "home",
  "book",
  "route",
  "bot",
  "article",
  "notes",
  "award",
  "search",
  "user",
  "users",
  "sparkles",
  "graduation",
  "building",
  "settings",
  "calendar",
  "bell",
  "message",
  "play",
  "dashboard",
  "help",
  "mail",
  "link",
  "star",
  "trending",
  "briefcase",
  "lightbulb",
  "shield",
] as const;

export type NavIconKey = (typeof NAV_ICON_KEYS)[number];

export const NAV_FALLBACK_ICON: NavIconKey = "link";

export const NAV_VISIBILITIES = ["all", "authenticated", "guest", "manager", "admin"] as const;

export type NavVisibility = (typeof NAV_VISIBILITIES)[number];

export const NAV_VISIBILITY_LABELS: Record<NavVisibility, string> = {
  all: "Todos",
  authenticated: "Somente logados",
  guest: "Somente visitantes",
  manager: "Gestores e admins",
  admin: "Somente admins",
};

export type NavItem = {
  /** Estável: sobrevive a renomear, reordenar e trocar de grupo. */
  id: string;
  /** Chave do catálogo de páginas, ou `null` quando é um link avulso. */
  pageKey: string | null;
  label: string;
  href: string;
  icon: NavIconKey;
  external: boolean;
  visibility: NavVisibility;
  enabled: boolean;
};

export type NavFooterGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

export type NavigationConfig = {
  menu: NavItem[];
  footer: { groups: NavFooterGroup[] };
};

/** Quantas colunas o rodapé consegue exibir sem virar sopa de links. */
export const NAV_FOOTER_MAX_GROUPS = 4;

// ---------------------------------------------------------------------------
// Catálogo de páginas reais da plataforma
// ---------------------------------------------------------------------------

export type NavCatalogPage = {
  key: string;
  href: string;
  defaultLabel: string;
  defaultIcon: NavIconKey;
  defaultVisibility: NavVisibility;
  hint?: string;
};

export const NAV_PAGE_CATALOG: NavCatalogPage[] = [
  { key: "inicio", href: "/", defaultLabel: "Início", defaultIcon: "home", defaultVisibility: "all" },
  { key: "cursos", href: "/cursos", defaultLabel: "Cursos", defaultIcon: "book", defaultVisibility: "all" },
  { key: "minha-trilha", href: "/minha-trilha", defaultLabel: "Minha Trilha", defaultIcon: "route", defaultVisibility: "authenticated" },
  { key: "agentes", href: "/agentes", defaultLabel: "Agentes", defaultIcon: "bot", defaultVisibility: "authenticated" },
  { key: "blog", href: "/blog", defaultLabel: "Insights", defaultIcon: "article", defaultVisibility: "all" },
  { key: "notas", href: "/notas", defaultLabel: "Anotações", defaultIcon: "notes", defaultVisibility: "authenticated" },
  { key: "certificados", href: "/certificados", defaultLabel: "Certificados", defaultIcon: "award", defaultVisibility: "authenticated" },
  { key: "busca", href: "/busca", defaultLabel: "Buscar", defaultIcon: "search", defaultVisibility: "all", hint: "O header já tem um atalho fixo de busca." },
  { key: "perfil", href: "/perfil", defaultLabel: "Meu perfil", defaultIcon: "user", defaultVisibility: "authenticated", hint: "O header já tem um atalho fixo de perfil." },
  { key: "onboarding", href: "/onboarding", defaultLabel: "Refazer onboarding", defaultIcon: "sparkles", defaultVisibility: "authenticated" },
  { key: "empresa-gestao", href: "/empresa/gestao", defaultLabel: "Gestão Corporativa", defaultIcon: "building", defaultVisibility: "manager" },
  { key: "admin", href: "/admin", defaultLabel: "Painel administrativo", defaultIcon: "settings", defaultVisibility: "admin" },
];

export function findCatalogPage(pageKey: string | null): NavCatalogPage | undefined {
  if (!pageKey) return undefined;
  return NAV_PAGE_CATALOG.find((page) => page.key === pageKey);
}

// ---------------------------------------------------------------------------
// Default: espelha exatamente o menu e o rodapé que existiam hardcoded
// ---------------------------------------------------------------------------

function item(
  id: string,
  pageKey: string | null,
  label: string,
  href: string,
  icon: NavIconKey,
  visibility: NavVisibility = "all",
): NavItem {
  return { id, pageKey, label, href, icon, external: false, visibility, enabled: true };
}

export const DEFAULT_NAVIGATION: NavigationConfig = {
  menu: [
    item("menu-inicio", "inicio", "Início", "/", "home"),
    item("menu-cursos", "cursos", "Cursos", "/cursos", "book"),
    item("menu-minha-trilha", "minha-trilha", "Minha Trilha", "/minha-trilha", "route"),
    item("menu-agentes", "agentes", "Agentes", "/agentes", "bot"),
    item("menu-blog", "blog", "Insights", "/blog", "article"),
    item("menu-notas", "notas", "Anotações", "/notas", "notes"),
  ],
  footer: {
    groups: [
      {
        id: "footer-aprender",
        title: "Aprender",
        items: [
          item("footer-cursos", "cursos", "Todos os cursos", "/cursos", "book"),
          item("footer-minha-trilha", "minha-trilha", "Minha trilha", "/minha-trilha", "route"),
          item("footer-notas", "notas", "Anotações", "/notas", "notes"),
        ],
      },
      {
        id: "footer-descobrir",
        title: "Descobrir",
        items: [
          item("footer-blog", "blog", "Insights", "/blog", "article"),
          item("footer-onboarding", "onboarding", "Refazer onboarding", "/onboarding", "sparkles"),
          item("footer-empresa-gestao", "empresa-gestao", "Gestão Corporativa", "/empresa/gestao", "building", "manager"),
          item("footer-admin", "admin", "Painel administrativo", "/admin", "settings", "admin"),
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

function parseItem(raw: unknown, fallbackId: string): NavItem | null {
  if (!isRecord(raw)) return null;

  const label = text(raw.label);
  const href = text(raw.href);
  // Um item sem rótulo ou sem destino não é um link: é um buraco na navegação.
  if (!label || !href) return null;

  const icon = text(raw.icon) as NavIconKey;
  const visibility = text(raw.visibility) as NavVisibility;

  return {
    id: text(raw.id) || fallbackId,
    pageKey: text(raw.pageKey) || null,
    label,
    href,
    icon: NAV_ICON_KEYS.includes(icon) ? icon : NAV_FALLBACK_ICON,
    external: typeof raw.external === "boolean" ? raw.external : isExternalHref(href),
    visibility: NAV_VISIBILITIES.includes(visibility) ? visibility : "all",
    enabled: raw.enabled !== false,
  };
}

function parseItems(raw: unknown, prefix: string): NavItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .map((entry, index) => parseItem(entry, `${prefix}-${index}`))
    .filter((entry): entry is NavItem => entry !== null)
    .map((entry) => {
      // Ids repetidos quebrariam a `key` do React e o alvo do arrastar-e-soltar.
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        return entry;
      }
      const unique = `${entry.id}-${seen.size}`;
      seen.add(unique);
      return { ...entry, id: unique };
    });
}

function parseGroups(raw: unknown): NavFooterGroup[] {
  if (!Array.isArray(raw)) return DEFAULT_NAVIGATION.footer.groups;
  return raw
    .slice(0, NAV_FOOTER_MAX_GROUPS)
    .map((entry, index) => {
      if (!isRecord(entry)) return null;
      const title = text(entry.title);
      if (!title) return null;
      const id = text(entry.id) || `footer-grupo-${index}`;
      return { id, title, items: parseItems(entry.items, `${id}-item`) };
    })
    .filter((entry): entry is NavFooterGroup => entry !== null);
}

/**
 * Converte o JSONB de `app_settings.navigation` em algo renderizável.
 *
 * Roda na leitura e também antes de gravar: é a única barreira entre o que o
 * formulário manda e o que o site inteiro passa a exibir.
 */
export function parseNavigationConfig(value: unknown): NavigationConfig {
  if (!isRecord(value)) return DEFAULT_NAVIGATION;

  const footer = isRecord(value.footer) ? value.footer : {};

  return {
    menu: Array.isArray(value.menu) ? parseItems(value.menu, "menu-item") : DEFAULT_NAVIGATION.menu,
    footer: { groups: parseGroups(footer.groups) },
  };
}

// ---------------------------------------------------------------------------
// Visibilidade
// ---------------------------------------------------------------------------

export type NavViewer = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
};

/**
 * O admin enxerga tudo que o gestor enxerga — sem isso, quem administra a
 * plataforma perderia de vista os links que acabou de configurar.
 */
export function isNavItemVisible(item: NavItem, viewer: NavViewer): boolean {
  if (!item.enabled) return false;
  switch (item.visibility) {
    case "authenticated":
      return viewer.isAuthenticated;
    case "guest":
      return !viewer.isAuthenticated;
    case "manager":
      return viewer.isManager || viewer.isAdmin;
    case "admin":
      return viewer.isAdmin;
    default:
      return true;
  }
}
