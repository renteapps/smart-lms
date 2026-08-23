import type {
  Agent,
  AgentAvatarKey,
  AgentCategory,
  AgentConversation,
  AgentConversationPage,
  AgentConversationSummary,
  AgentFile,
  AgentMessage,
  AgentScriptedReply,
  AgentStarter,
  AgentStatus,
  ConversationSentiment,
  ConversationStatus,
} from "@/types/agente";
import { logQueryError, type DB, type Row } from "./types";

const AGENT_SELECT = `
  id, slug, name, role, description, category, status, avatar, theme_color, icon_svg, photo_url, created_by,
  course_id, course_title, course_ids, plan_ids, skills, rating, avg_minutes, greeting, starters,
  replies, fallbacks, files, unavailable_note, system_prompt, ai_model, context,
  is_published, order_index, created_at, updated_at, agent_conversations(count)
`;

const AGENT_CATALOG_SELECT = `
  id, slug, name, role, description, category, status, avatar, theme_color, icon_svg, photo_url, created_by,
  course_id, course_title, course_ids, plan_ids, skills, rating, avg_minutes,
  greeting, starters, unavailable_note, is_published, order_index, created_at,
  agent_conversations(count)
`;

export function mapAgent(row: Row, conversationsCount?: number): Agent {
  const courseIds: string[] = Array.isArray(row.course_ids)
    ? row.course_ids
    : row.course_id
      ? [row.course_id]
      : [];
  const planIds: string[] = Array.isArray(row.plan_ids) ? row.plan_ids : [];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role ?? "",
    description: row.description ?? "",
    category: (row.category ?? "Comunicação") as AgentCategory,
    status: (row.status ?? "Disponível") as AgentStatus,
    avatar: (row.avatar ?? "tutor") as AgentAvatarKey,
    themeColor: row.theme_color ?? undefined,
    iconSvg: row.icon_svg ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    createdBy: row.created_by ?? "Equipe Smart LMS",
    courseTitle: row.course_title ?? "",
    courseId: row.course_id ?? (courseIds.length > 0 ? courseIds[0] : undefined),
    courseIds,
    courseTitles: Array.isArray(row.course_titles) ? row.course_titles : (row.course_title ? [row.course_title] : []),
    planIds,
    planNames: Array.isArray(row.plan_names) ? row.plan_names : [],
    skills: row.skills ?? [],
    conversationsCount: conversationsCount ?? Number(row.agent_conversations?.[0]?.count ?? 0),
    rating: row.rating != null ? Number(row.rating) : 0,
    avgMinutes: row.avg_minutes ?? 0,
    greeting: row.greeting ?? "",
    starters: (row.starters ?? []) as AgentStarter[],
    replies: (row.replies ?? []) as AgentScriptedReply[],
    fallbacks: (row.fallbacks ?? []) as string[],
    files: (row.files ?? []) as AgentFile[],
    unavailableNote: row.unavailable_note ?? undefined,
    systemPrompt: row.system_prompt ?? undefined,
    aiModel: row.ai_model ?? undefined,
    context: row.context ?? undefined,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (val: unknown): val is string => typeof val === "string" && UUID_REGEX.test(val);

/** Payload de escrita: converte o tipo de domínio para colunas. */
export function agentToRow(agent: Partial<Agent> & { courseId?: string | null }): Row {
  const row: Row = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) row[key] = value;
  };

  set("slug", agent.slug);
  set("name", agent.name);
  set("role", agent.role);
  set("description", agent.description);
  set("category", agent.category);
  set("status", agent.status);
  set("avatar", agent.avatar);
  set("theme_color", agent.themeColor ?? null);
  set("icon_svg", agent.iconSvg ?? null);
  set("photo_url", agent.photoUrl ?? null);
  set("created_by", agent.createdBy);

  const validCourseIds = Array.isArray(agent.courseIds) ? agent.courseIds.filter(isUuid) : [];
  const validCourseId = isUuid(agent.courseId)
    ? agent.courseId
    : validCourseIds.length > 0
      ? validCourseIds[0]
      : null;

  set("course_id", validCourseId);
  set("course_title", agent.courseTitle);
  set("course_ids", validCourseIds.length > 0 ? validCourseIds : validCourseId ? [validCourseId] : []);
  set("plan_ids", Array.isArray(agent.planIds) ? agent.planIds.filter(isUuid) : []);
  set("skills", agent.skills);
  set("avg_minutes", agent.avgMinutes);
  set("greeting", agent.greeting);
  set("starters", agent.starters);
  set("replies", agent.replies);
  set("fallbacks", agent.fallbacks);
  set("files", agent.files);
  set("unavailable_note", agent.unavailableNote ?? null);
  set("system_prompt", agent.systemPrompt ?? null);
  set("ai_model", agent.aiModel ?? null);
  set("context", agent.context ?? null);
  return row;
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

/**
 * Preenche `courseTitles`/`planNames` a partir dos IDs vinculados.
 *
 * Essas colunas não existem na tabela `agents` (só `course_ids`/`plan_ids`) —
 * um agente com vários cursos vinculados perderia os nomes dos demais sem
 * este join, e a listagem mostraria "+N" sem dizer quais são.
 */
async function enrichCourseAndPlanNames(db: DB, agents: Agent[]): Promise<Agent[]> {
  const courseIds = Array.from(new Set(agents.flatMap((a) => a.courseIds ?? [])));
  const planIds = Array.from(new Set(agents.flatMap((a) => a.planIds ?? [])));

  if (courseIds.length === 0 && planIds.length === 0) return agents;

  const [coursesResult, plansResult] = await Promise.all([
    courseIds.length > 0
      ? db.from("courses").select("id, title").in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
    planIds.length > 0
      ? db.from("plans").select("id, name").in("id", planIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  logQueryError("enrichCourseAndPlanNames:courses", coursesResult.error);
  logQueryError("enrichCourseAndPlanNames:plans", plansResult.error);

  const courseTitleById = new Map(
    (coursesResult.data ?? []).map((c: { id: string; title: string }) => [c.id, c.title]),
  );
  const planNameById = new Map((plansResult.data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));

  return agents.map((agent) => {
    const resolvedCourseTitles = (agent.courseIds ?? [])
      .map((cId) => courseTitleById.get(cId))
      .filter((title): title is string => Boolean(title));
    const resolvedPlanNames = (agent.planIds ?? [])
      .map((pId) => planNameById.get(pId))
      .filter((name): name is string => Boolean(name));

    return {
      ...agent,
      courseTitles: resolvedCourseTitles.length > 0 ? resolvedCourseTitles : agent.courseTitles,
      planNames: resolvedPlanNames.length > 0 ? resolvedPlanNames : agent.planNames,
    };
  });
}

export async function getAgents(db: DB, includeUnpublished = false): Promise<Agent[]> {
  let query = db
    .from("agents")
    .select(AGENT_SELECT)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeUnpublished) query = query.eq("is_published", true);

  const { data, error } = await query;
  logQueryError("getAgents", error);

  return enrichCourseAndPlanNames(db, (data ?? []).map((row: Row) => mapAgent(row)));
}

/** Catálogo público sem prompt, contexto, arquivos ou roteiro interno. */
export async function getAgentCatalog(db: DB): Promise<Agent[]> {
  const { data, error } = await db
    .from("agents")
    .select(AGENT_CATALOG_SELECT)
    .eq("is_published", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  logQueryError("getAgentCatalog", error);
  return enrichCourseAndPlanNames(db, (data ?? []).map((row: Row) => mapAgent(row)));
}

export async function getAgentBySlug(db: DB, slug: string): Promise<Agent | null> {
  const { data, error } = await db.from("agents").select(AGENT_SELECT).eq("slug", slug).maybeSingle();
  logQueryError("getAgentBySlug", error);
  if (!data) return null;

  const { count } = await db
    .from("agent_conversations")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", data.id);

  const [agent] = await enrichCourseAndPlanNames(db, [mapAgent(data, count ?? 0)]);
  return agent;
}

/**
 * Só para o backend de chat (via `agentId`): nunca exibida, então não vale o
 * join extra de nomes de curso/plano que `getAgentBySlug`/`getAgents` fazem.
 */
export async function getAgentById(db: DB, id: string): Promise<Agent | null> {
  const { data, error } = await db.from("agents").select(AGENT_SELECT).eq("id", id).maybeSingle();
  logQueryError("getAgentById", error);
  return data ? mapAgent(data) : null;
}

export function deriveAgentCategories(agents: Agent[]): string[] {
  return ["Todos", ...Array.from(new Set(agents.map((agent) => agent.category)))];
}

/** Segmento de URL a partir do nome: sem acento, sem símbolo, hifenizado. */
export function slugifyAgentName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug livre a partir de uma base: feedback → feedback-2 → feedback-3. */
export function ensureUniqueSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let suffix = 2;
  while (taken.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Conversas
// ---------------------------------------------------------------------------

function mapConversation(row: Row): AgentConversation {
  const messages: AgentMessage[] = (row.agent_messages ?? [])
    .slice()
    .sort((a: Row, b: Row) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((message: Row) => ({
      id: message.id,
      author: message.author as AgentMessage["author"],
      text: message.text,
      feedback: (message.feedback ?? null) as AgentMessage["feedback"],
    }));

  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    messages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    studentName: row.profiles?.full_name ?? undefined,
    studentEmail: row.profiles?.email ?? undefined,
    studentAvatar: row.profiles?.avatar_url ?? undefined,
    rating: row.rating ?? undefined,
    status: (row.status ?? undefined) as ConversationStatus | undefined,
    sentiment: (row.sentiment ?? undefined) as ConversationSentiment | undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    tokensUsed: row.tokens_used ?? undefined,
    courseTitle: row.course_title ?? undefined,
    lessonContext: row.lesson_context ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    messagesLoaded: true,
    messageCount: messages.length,
  };
}

function mapConversationSummary(row: Row): AgentConversationSummary {
  const countValue = Array.isArray(row.agent_messages) ? row.agent_messages[0]?.count : 0;
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    messages: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rating: row.rating ?? undefined,
    status: (row.status ?? undefined) as ConversationStatus | undefined,
    sentiment: (row.sentiment ?? undefined) as ConversationSentiment | undefined,
    courseTitle: row.course_title ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    messagesLoaded: false,
    messageCount: Number(countValue ?? 0),
  };
}

const CONVERSATION_SELECT = `
  id, agent_id, user_id, title, rating, status, sentiment, duration_seconds,
  tokens_used, course_title, lesson_context, ai_summary, created_at, updated_at,
  agent_messages ( id, author, text, feedback, created_at )
`;

/** Threads do aluno da sessão, mais recentes primeiro. */
export async function getMyConversations(db: DB, userId: string): Promise<AgentConversation[]> {
  const { data, error } = await db
    .from("agent_conversations")
    .select(CONVERSATION_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  logQueryError("getMyConversations", error);
  return (data ?? []).map(mapConversation);
}

function encodeConversationCursor(row: Row): string {
  return Buffer.from(JSON.stringify({ updatedAt: row.updated_at, id: row.id })).toString("base64url");
}

function decodeConversationCursor(cursor?: string | null): { updatedAt: string; id: string } | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return typeof value.updatedAt === "string" && typeof value.id === "string" ? value : null;
  } catch {
    return null;
  }
}

/** Resumos por cursor; mensagens são buscadas somente ao abrir a thread. */
export async function getMyConversationSummaries(
  db: DB,
  userId: string,
  cursor?: string | null,
  limit = 30,
): Promise<AgentConversationPage> {
  const safeLimit = Math.min(50, Math.max(1, limit));
  let query = db
    .from("agent_conversations")
    .select(`
      id, agent_id, title, rating, status, sentiment, course_title, ai_summary,
      created_at, updated_at, agent_messages(count)
    `)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1);

  const decoded = decodeConversationCursor(cursor);
  if (decoded) {
    query = query.or(
      `updated_at.lt.${decoded.updatedAt},and(updated_at.eq.${decoded.updatedAt},id.lt.${decoded.id})`,
    );
  }

  const { data, error } = await query;
  logQueryError("getMyConversationSummaries", error);
  const rows = data ?? [];
  const hasMore = rows.length > safeLimit;
  const pageRows = rows.slice(0, safeLimit);
  return {
    items: pageRows.map(mapConversationSummary),
    nextCursor: hasMore && pageRows.length ? encodeConversationCursor(pageRows[pageRows.length - 1]) : null,
  };
}

export async function getMyConversation(
  db: DB,
  userId: string,
  conversationId: string,
): Promise<AgentConversation | null> {
  const { data, error } = await db
    .from("agent_conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  logQueryError("getMyConversation", error);
  return data ? mapConversation(data) : null;
}

/** Histórico completo de um agente — tela de admin. */
export async function getAgentConversations(db: DB, agentId: string): Promise<AgentConversation[]> {
  const { data, error } = await db
    .from("agent_conversations")
    .select(`${CONVERSATION_SELECT}, profiles:user_id ( full_name, email, avatar_url )`)
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false });

  logQueryError("getAgentConversations", error);
  return (data ?? []).map(mapConversation);
}

export async function getConversation(db: DB, id: string): Promise<AgentConversation | null> {
  const { data, error } = await db
    .from("agent_conversations")
    .select(`${CONVERSATION_SELECT}, profiles:user_id ( full_name, email, avatar_url )`)
    .eq("id", id)
    .maybeSingle();

  logQueryError("getConversation", error);
  return data ? mapConversation(data) : null;
}

const MAX_TITLE_LENGTH = 52;

/**
 * Título da thread a partir da primeira mensagem do aluno — o mesmo contrato do
 * ChatGPT e do Claude: quem nomeia a conversa é a pergunta, não o aluno.
 */
export function deriveConversationTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Nova conversa";
  if (clean.length <= MAX_TITLE_LENGTH) return clean;

  const cut = clean.slice(0, MAX_TITLE_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > MAX_TITLE_LENGTH * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
