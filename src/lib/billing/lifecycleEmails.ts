import "server-only";

import { isSubscriptionActive } from "@/lib/courseAccess";
import type { DB, Row } from "@/lib/data/types";
import { buildUnsubscribe } from "@/lib/emailUnsubscribe";
import { getResendServerConfig, sendConfiguredEmail } from "@/lib/resendServer";
import { emailCategoryBlockReason } from "@/lib/resendService";
import { getSiteUrl } from "@/lib/siteUrl";
import { planLifecycleEmail, type LifecycleKind, type LifecycleSubscription, DAY_MS } from "./lifecyclePlan";

/*
 * E-mails de ciclo de vida da assinatura, disparados pelo cron diário
 * /api/cron/subscription-emails. A decisão de QUAL e-mail cabe a cada
 * assinatura é pura e testada em `lifecyclePlan.ts`; aqui ficam a leitura do
 * banco, a trava contra duplicata e o envio.
 *
 * Três garantias:
 *  - cada e-mail sai no máximo uma vez por período (UNIQUE em
 *    subscription_email_sends; renovar muda o período e recomeça o ciclo);
 *  - quem renovou ou tem outra assinatura com acesso (pessoal ou da empresa)
 *    não recebe nada;
 *  - a sequência de reconquista respeita o descadastro e os liga/desliga do
 *    admin do Resend.
 */

const LOOKBACK_DAYS = 40;
const LOOKAHEAD_DAYS = 8;

export type LifecycleRunSummary = {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type Candidate = {
  subscription: LifecycleSubscription & { user_id: string; current_period_end: string };
  kind: LifecycleKind;
  planName: string;
  checkoutUrl: string | null;
};

const GATEWAY_NAMES: Record<string, string> = { hotmart: "Hotmart", eduzz: "Eduzz" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function validCheckoutUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Frase pronta do progresso — nunca "0 aulas". */
export function progressSummary(completed: number, lastCourse: string | null): string {
  if (completed <= 0) {
    return "Sua conta continua guardada, pronta para quando você quiser começar ou retomar os estudos.";
  }
  const base = `Você já concluiu ${plural(completed, "aula", "aulas")}`;
  return lastCourse ? `${base} — a última foi em “${lastCourse}”.` : `${base} na plataforma.`;
}

/** Frase pronta das novidades desde o fim do acesso — neutra quando não há. */
export function newsSummary(newCourses: number, newLessons: number): string {
  const parts = [
    newCourses > 0 ? plural(newCourses, "curso novo", "cursos novos") : null,
    newLessons > 0 ? plural(newLessons, "aula nova", "aulas novas") : null,
  ].filter(Boolean);
  if (parts.length === 0) {
    return "Os cursos, a sua trilha e os agentes de IA continuam disponíveis para quem tem o acesso ativo — e novos conteúdos são publicados ao longo do tempo.";
  }
  return `Desde que seu acesso terminou, entraram na plataforma ${parts.join(" e ")}.`;
}

/** Usuários que têm acesso por OUTRA assinatura (pessoal ou da empresa). */
async function usersCoveredElsewhere(
  db: DB,
  candidates: Candidate[],
  now: Date,
): Promise<Set<string>> {
  const userIds = [...new Set(candidates.map((c) => c.subscription.user_id))];
  const covered = new Set<string>();
  if (userIds.length === 0) return covered;

  const [{ data: personal, error: personalError }, { data: memberships, error: membershipError }] = await Promise.all([
    db.from("subscriptions")
      .select("id, user_id, status, current_period_end, plans!inner(is_active)")
      .in("user_id", userIds),
    db.from("organization_members")
      .select("user_id, organization_id")
      .in("user_id", userIds)
      .eq("status", "active"),
  ]);
  if (personalError) throw new Error(`Falha ao ler assinaturas: ${personalError.message}`);
  if (membershipError) throw new Error(`Falha ao ler vínculos com empresas: ${membershipError.message}`);

  const candidateBySub = new Map(candidates.map((c) => [c.subscription.id, c]));
  for (const row of (personal ?? []) as Row[]) {
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    if (plan?.is_active === false) continue;
    if (!isSubscriptionActive({ status: row.status, currentPeriodEnd: row.current_period_end }, now)) continue;

    // A própria assinatura do aviso não conta; qualquer outra com acesso conta.
    for (const candidate of candidates) {
      if (candidate.subscription.user_id !== row.user_id || candidateBySub.get(row.id) === candidate) continue;
      const otherEnd = row.current_period_end ? new Date(row.current_period_end).getTime() : Infinity;
      // Para o aviso prévio, só conta se a outra assinatura vai além do vencimento avisado.
      const coversBeyond = otherEnd > new Date(candidate.subscription.current_period_end).getTime();
      if (coversBeyond || candidate.kind.startsWith("winback") || candidate.kind === "subscription_expired") {
        covered.add(row.user_id);
      }
    }
  }

  const orgIds = [...new Set(((memberships ?? []) as Row[]).map((m) => m.organization_id))];
  if (orgIds.length > 0) {
    const { data: orgSubs, error } = await db.from("subscriptions")
      .select("organization_id, status, current_period_end, plans!inner(is_active)")
      .in("organization_id", orgIds);
    if (error) throw new Error(`Falha ao ler assinaturas de empresas: ${error.message}`);
    const activeOrgs = new Set(((orgSubs ?? []) as Row[])
      .filter((row) => {
        const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
        return plan?.is_active !== false
          && isSubscriptionActive({ status: row.status, currentPeriodEnd: row.current_period_end }, now);
      })
      .map((row) => row.organization_id));
    for (const m of (memberships ?? []) as Row[]) {
      if (activeOrgs.has(m.organization_id)) covered.add(m.user_id);
    }
  }
  return covered;
}

async function progressFor(db: DB, userId: string): Promise<string> {
  const { data, count, error } = await db
    .from("lesson_progress")
    .select("lesson_id, completed_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("is_completed", true)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) return progressSummary(0, null);

  let lastCourse: string | null = null;
  const lastLessonId = (data as Row[] | null)?.[0]?.lesson_id;
  if (lastLessonId) {
    const { data: lesson } = await db
      .from("lessons")
      .select("modules!inner(courses!inner(title))")
      .eq("id", lastLessonId)
      .maybeSingle();
    const mod = lesson ? (Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules) : null;
    const course = mod ? (Array.isArray(mod.courses) ? mod.courses[0] : mod.courses) : null;
    lastCourse = typeof course?.title === "string" ? course.title : null;
  }
  return progressSummary(count ?? 0, lastCourse);
}

async function newsSince(db: DB, since: string): Promise<string> {
  const [courses, lessons] = await Promise.all([
    db.from("courses").select("id", { count: "exact", head: true }).eq("status", "Publicado").gt("created_at", since),
    db.from("lessons").select("id", { count: "exact", head: true }).eq("is_published", true).gt("created_at", since),
  ]);
  return newsSummary(courses.count ?? 0, lessons.count ?? 0);
}

/**
 * Reserva o envio antes de mandar. Primeira vez: insere. Já existe: só
 * reaproveita se a tentativa anterior falhou. Sem linha = já foi tratado.
 */
async function claim(db: DB, candidate: Candidate): Promise<string | null> {
  const key = {
    subscription_id: candidate.subscription.id,
    kind: candidate.kind,
    period_end: candidate.subscription.current_period_end,
  };
  const { data: inserted, error } = await db
    .from("subscription_email_sends")
    .upsert({ ...key, user_id: candidate.subscription.user_id, status: "sending" }, {
      onConflict: "subscription_id,kind,period_end",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) throw new Error(`Falha ao reservar envio: ${error.message}`);
  if (inserted && inserted.length > 0) return inserted[0].id as string;

  const { data: retried, error: retryError } = await db
    .from("subscription_email_sends")
    .update({ status: "sending", error: null })
    .eq("subscription_id", key.subscription_id)
    .eq("kind", key.kind)
    .eq("period_end", key.period_end)
    .eq("status", "failed")
    .select("id");
  if (retryError) throw new Error(`Falha ao reservar reenvio: ${retryError.message}`);
  return retried && retried.length > 0 ? (retried[0].id as string) : null;
}

export async function runSubscriptionLifecycleEmails(db: DB, now = new Date()): Promise<LifecycleRunSummary> {
  const summary: LifecycleRunSummary = { checked: 0, sent: 0, skipped: 0, failed: 0, errors: [] };

  const { data: rows, error } = await db
    .from("subscriptions")
    .select("id, user_id, status, gateway, cancel_at_period_end, current_period_end, plans(name, features)")
    .not("user_id", "is", null)
    .gte("current_period_end", new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS).toISOString())
    .lte("current_period_end", new Date(now.getTime() + LOOKAHEAD_DAYS * DAY_MS).toISOString());
  if (error) throw new Error(`Falha ao listar assinaturas: ${error.message}`);

  const candidates: Candidate[] = [];
  for (const row of (rows ?? []) as Row[]) {
    summary.checked += 1;
    const kind = planLifecycleEmail(row as LifecycleSubscription, now);
    if (!kind) continue;
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    const features = plan?.features && typeof plan.features === "object" && !Array.isArray(plan.features)
      ? (plan.features as Record<string, unknown>)
      : {};
    candidates.push({
      subscription: row as Candidate["subscription"],
      kind,
      planName: typeof plan?.name === "string" ? plan.name : "seu plano",
      checkoutUrl: validCheckoutUrl(features.checkoutUrl),
    });
  }
  if (candidates.length === 0) return summary;

  const userIds = [...new Set(candidates.map((c) => c.subscription.user_id))];
  const [covered, config, { data: profiles }, { data: optOuts }] = await Promise.all([
    usersCoveredElsewhere(db, candidates, now),
    getResendServerConfig(db),
    db.from("profiles").select("id, full_name, email").in("id", userIds),
    db.from("email_opt_outs").select("user_id").eq("category", "winback").in("user_id", userIds),
  ]);
  const profileById = new Map(((profiles ?? []) as Row[]).map((p) => [p.id, p]));
  const optedOut = new Set(((optOuts ?? []) as Row[]).map((o) => o.user_id));
  const siteUrl = getSiteUrl();

  for (const candidate of candidates) {
    const { subscription, kind } = candidate;
    const isWinback = kind.startsWith("winback");
    const profile = profileById.get(subscription.user_id);

    if (
      covered.has(subscription.user_id)
      || (isWinback && optedOut.has(subscription.user_id))
      || !profile?.email
      // Categoria desligada no admin: nem reserva, para voltar a valer se religarem.
      || emailCategoryBlockReason(kind, config.categories)
    ) {
      summary.skipped += 1;
      continue;
    }

    let sendId: string | null = null;
    try {
      sendId = await claim(db, candidate);
      if (!sendId) {
        summary.skipped += 1;
        continue;
      }

      const unsubscribe = isWinback ? buildUnsubscribe(subscription.user_id, "winback") : null;
      if (isWinback && !unsubscribe) throw new Error("Não foi possível gerar o link de descadastro.");

      const lapsedDays = Math.max(0, Math.floor((now.getTime() - new Date(subscription.current_period_end).getTime()) / DAY_MS));
      const result = await sendConfiguredEmail(db, {
        to: profile.email,
        userId: subscription.user_id,
        subject: "",
        template: kind,
        data: {
          nome: String(profile.full_name ?? "").trim().split(/\s+/)[0] || "aluno(a)",
          nome_plano: candidate.planName,
          data_vencimento: formatDate(subscription.current_period_end),
          link_renovacao: candidate.checkoutUrl ?? siteUrl,
          nome_gateway: GATEWAY_NAMES[subscription.gateway ?? ""] ?? "plataforma de pagamento",
          resumo_progresso: await progressFor(db, subscription.user_id),
          ...(isWinback && {
            resumo_novidades: await newsSince(db, subscription.current_period_end),
            dias_sem_acesso: String(lapsedDays),
            link_descadastro: unsubscribe!.pageUrl,
          }),
        },
        headers: unsubscribe?.headers,
        tags: [{ name: "origem", value: "ciclo-assinatura" }],
      });

      // Simulado = Resend sem chave: nada saiu, então conta como falha e tenta de novo.
      const delivered = result.success && !result.simulated;
      const failure = delivered ? null : result.error ?? "Resend não configurado (envio simulado).";
      await db.from("subscription_email_sends")
        .update({ status: delivered ? "sent" : "failed", error: failure })
        .eq("id", sendId);

      if (delivered) summary.sent += 1;
      else {
        summary.failed += 1;
        summary.errors.push(`${kind}: ${failure}`);
      }
    } catch (sendError) {
      const message = (sendError as Error).message;
      summary.failed += 1;
      summary.errors.push(`${kind}: ${message}`);
      // Reserva feita e envio interrompido: libera para tentar de novo amanhã.
      if (sendId) {
        await db.from("subscription_email_sends").update({ status: "failed", error: message }).eq("id", sendId);
      }
    }
  }
  return summary;
}
