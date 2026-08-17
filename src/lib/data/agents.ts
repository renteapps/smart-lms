import type {
  Agent,
  AgentAvatarKey,
  AgentCategory,
  AgentConversation,
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
  id, slug, name, role, description, category, status, avatar, created_by,
  course_id, course_title, course_ids, plan_ids, skills, rating, avg_minutes, greeting, starters,
  replies, fallbacks, files, unavailable_note, system_prompt, ai_model, context,
  is_published, order_index, created_at, updated_at
`;

export function mapAgent(row: Row, conversationsCount = 0): Agent {
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
    createdBy: row.created_by ?? "Equipe Smart LMS",
    courseTitle: row.course_title ?? "",
    courseId: row.course_id ?? (courseIds.length > 0 ? courseIds[0] : undefined),
    courseIds,
    courseTitles: Array.isArray(row.course_titles) ? row.course_titles : (row.course_title ? [row.course_title] : []),
    planIds,
    planNames: Array.isArray(row.plan_names) ? row.plan_names : [],
    skills: row.skills ?? [],
    conversationsCount,
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
  set("created_by", agent.createdBy);
  set("course_id", agent.courseId ?? (agent.courseIds && agent.courseIds.length > 0 ? agent.courseIds[0] : null));
  set("course_title", agent.courseTitle);
  set("course_ids", agent.courseIds ?? (agent.courseId ? [agent.courseId] : []));
  set("plan_ids", agent.planIds ?? []);
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

/** Quantas conversas cada agente já sustentou — o contador da vitrine. */
async function getConversationCounts(db: DB): Promise<Map<string, number>> {
  const { data, error } = await db.from("agent_conversations").select("agent_id");
  logQueryError("getConversationCounts", error);

  const counts = new Map<string, number>();
  (data ?? []).forEach((row: Row) => {
    counts.set(row.agent_id, (counts.get(row.agent_id) ?? 0) + 1);
  });
  return counts;
}

export async function getAgents(db: DB, includeUnpublished = false): Promise<Agent[]> {
  let query = db
    .from("agents")
    .select(AGENT_SELECT)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (!includeUnpublished) query = query.eq("is_published", true);

  const [{ data, error }, counts] = await Promise.all([query, getConversationCounts(db)]);
  logQueryError("getAgents", error);

  return (data ?? []).map((row: Row) => mapAgent(row, counts.get(row.id) ?? 0));
}

export async function getAgentBySlug(db: DB, slug: string): Promise<Agent | null> {
  const { data, error } = await db.from("agents").select(AGENT_SELECT).eq("slug", slug).maybeSingle();
  logQueryError("getAgentBySlug", error);
  if (!data) return null;

  const { count } = await db
    .from("agent_conversations")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", data.id);

  return mapAgent(data, count ?? 0);
}

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
  };
}

const CONVERSATION_SELECT = `
  id, agent_id, user_id, title, rating, status, sentiment, duration_seconds,
  tokens_used, course_title, lesson_context, ai_summary, created_at, updated_at,
  agent_messages ( id, author, text, created_at )
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
