"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Alert } from "@heroui/react/alert";
import { Skeleton } from "@heroui/react/skeleton";
import { applySessionFeedback, generateLearningTrail, replanLearningTrail } from "@/lib/matching";
import { saveLearningTrail } from "@/lib/trailStorage";
import { notifyTrailChanged, useStoredValue, useTrailStore } from "@/lib/useTrailStore";
import { recordTrailEvent } from "@/lib/trailAnalytics";
import {
  computeStudyStats,
  deriveImplicitSignals,
  deriveProfileSummary,
  rankCatalogByAffinity,
  selectHomeState,
} from "@/lib/studentHome";
import {
  pickRecalibration,
  readRefinementState,
  recordSurveyAnswer,
  REFINEMENT_STORAGE_KEY,
} from "@/lib/refinementSurveys";
import RecalibrationSlot from "@/components/home/RecalibrationSlot";
import type { SessionLoadRating } from "@/types/trilha";
import type { CatalogCourse } from "@/types/course";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { PROFILE_STORAGE_KEY, PROFILE_SAVED_EVENT } from "@/components/profile/ProfileEditor";
import DailyPill from "@/components/DailyPill";
import DayCompleteHero from "@/components/home/DayCompleteHero";
import DiscoverySection from "@/components/home/DiscoverySection";
import HomeEmptyState from "@/components/home/HomeEmptyState";
import HomeNoCourses from "@/components/home/HomeNoCourses";
import NextStepHero from "@/components/home/NextStepHero";
import SessionRest from "@/components/home/SessionRest";
import StudyLedger from "@/components/home/StudyLedger";
import WhyThisTrail from "@/components/home/WhyThisTrail";
import { Rise } from "@/components/ui/Rise";
import { useUserAccess } from "@/hooks/useUserAccess";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

function subscribeToProfile(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PROFILE_SAVED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PROFILE_SAVED_EVENT, onChange);
  };
}

const readProfileRaw = () => window.localStorage.getItem(PROFILE_STORAGE_KEY);
const noProfile = () => null;

/** Só o primeiro nome: "Olá, Mariana Costa" soa como cobrança de banco. */
function firstNameFrom(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const name = (parsed as { name?: unknown }).name;
    return typeof name === "string" && name.trim() ? name.trim().split(/\s+/)[0] : null;
  } catch {
    return null;
  }
}

function HomeSkeleton() {
  return (
    <div
      className="editorial-container pt-[clamp(3rem,7vw,6rem)]"
      aria-busy="true"
      aria-label="Carregando seu painel"
    >
      <Skeleton className="h-3 w-48 rounded-md" />
      <div className="mt-8 grid gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div>
          <Skeleton className="h-6 w-56 rounded-full" />
          <Skeleton className="mt-6 h-16 w-full max-w-2xl rounded-xl" />
          <Skeleton className="mt-5 h-12 w-full max-w-xl rounded-lg" />
          <Skeleton className="mt-9 h-12 w-64 rounded-lg" />
        </div>
        <Skeleton className="hidden aspect-[4/3] rounded-2xl lg:block" />
      </div>
      <Skeleton className="mt-14 h-28 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Orquestrador da home.
 *
 * Assina o armazenamento em um lugar só e distribui props. A home anterior tinha
 * dois leitores da mesma chave `minha_trilha` em componentes diferentes, cada um
 * com uma normalização própria — era por isso que o "continuar aprendendo" do
 * topo e o "comece por aqui" do meio apontavam para aulas diferentes.
 */
export default function StudentHomeClient() {
  const { hydrated, trail, questionnaire, error, migrated } = useTrailStore();
  const { courses, dailyPill, profileTests, loading } = useSupabaseData();
  const profileRaw = useSyncExternalStore(subscribeToProfile, readProfileRaw, noProfile);
  const refinementRaw = useStoredValue(REFINEMENT_STORAGE_KEY);
  /** O que a última recalibração mudou — some na próxima navegação, de propósito. */
  const [outcome, setOutcome] = useState<string | null>(null);

  /*
   * Verifica acesso ao conteúdo somente quando não há trilha — evita chamadas
   * desnecessárias ao Supabase para quem já está estudando.
   */
  const state = useMemo(() => selectHomeState(trail), [trail]);
  const accessState = useUserAccess(hydrated && state.kind === "sem-trilha");

  /*
   * Sinal implícito: o que ficou para trás volta para a agenda sozinho. É uma
   * escrita num sistema externo, não um `setState` — a releitura vem do store.
   */
  useEffect(() => {
    if (!trail) return;
    const { trail: next, changed } = replanLearningTrail(trail);
    if (!changed && !migrated) return;
    saveLearningTrail(changed ? next : trail);
    if (changed) recordTrailEvent("trail_replanned", { reason: "overdue" });
    notifyTrailChanged();
  }, [trail, migrated]);

  // `state` já foi derivado acima junto com `accessState` para evitar duplicação.
  const stats = useMemo(() => (trail ? computeStudyStats(trail) : null), [trail]);
  const profileChips = useMemo(
    () => (trail ? deriveProfileSummary(trail, questionnaire) : []),
    [trail, questionnaire],
  );
  const discovery = useMemo(
    () => rankCatalogByAffinity<CatalogCourse>(courses, trail, questionnaire).slice(0, 3),
    [courses, trail, questionnaire],
  );

  const recalibration = useMemo(() => {
    if (!trail || profileTests.length === 0) return null;
    return pickRecalibration({
      state,
      questionnaire,
      signals: deriveImplicitSignals(trail),
      refinement: readRefinementState(refinementRaw),
      profileTests,
    });
  }, [trail, state, questionnaire, refinementRaw, profileTests]);

  const handleFeedback = useCallback(
    (rating: SessionLoadRating) => {
      if (!trail || state.kind !== "dia-concluido") return;
      const updated = applySessionFeedback(trail, state.session.sessionId, rating);
      saveLearningTrail(updated);
      recordTrailEvent("session_feedback", { sessionId: state.session.sessionId, rating });
      notifyTrailChanged();
      setOutcome(
        rating === "light"
          ? "As próximas sessões ganharam até 10 minutos."
          : rating === "heavy"
            ? "Reduzimos a carga: as próximas sessões ficaram mais leves."
            : "Ritmo mantido — as próximas sessões seguem com a mesma meta.",
      );
    },
    [trail, state],
  );

  /*
   * A resposta volta para `trail.answers` e o motor roda de novo com a trilha
   * atual como base: `generateLearningTrail` preserva o que já foi concluído e o
   * que a pessoa removeu, então recalibrar nunca apaga histórico.
   */
  const handleAnswerSurvey = useCallback(
    (questionId: string, values: string[]) => {
      if (!trail || !questionnaire) return;

      const answers = { ...trail.answers, [questionId]: values };
      const before = new Set(trail.items.map((item) => item.id));
      const updated = generateLearningTrail(
        trail.userId,
        answers,
        questionnaire,
        { ...trail.availability, minutesPerSession: trail.adaptiveMinutesPerSession || trail.availability.minutesPerSession },
        trail,
      );
      const added = updated.items.filter((item) => !before.has(item.id)).length;
      const removed = trail.items.filter(
        (item) => item.status === "pending" && !updated.items.some((entry) => entry.id === item.id),
      ).length;

      saveLearningTrail(updated);
      recordSurveyAnswer(questionId, deriveImplicitSignals(trail).completedCount);
      recordTrailEvent("plan_generated", { reason: "refinement", questionId });
      notifyTrailChanged();

      setOutcome(
        added === 0 && removed === 0
          ? "Sua resposta foi registrada. A sequência atual continua fazendo sentido."
          : [
            added > 0 ? `${added} ${added === 1 ? "conteúdo entrou" : "conteúdos entraram"}` : null,
            removed > 0 ? `${removed} ${removed === 1 ? "saiu" : "saíram"}` : null,
          ].filter(Boolean).join(" e ") + " na sua trilha.",
      );
    },
    [trail, questionnaire],
  );

  if (!hydrated || loading) {
    return (
      <div className="pt-[76px]">
        <HomeSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <main className="editorial-container flex min-h-[70vh] items-center pt-[76px]">
        <Alert status="danger" className="w-full">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Não foi possível ler sua trilha</Alert.Title>
            <Alert.Description>
              O dado guardado neste dispositivo está indisponível. Suas respostas originais não
              foram apagadas — refazer o questionário reconstrói a agenda.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </main>
    );
  }

  if (state.kind === "sem-trilha") {
    /*
     * Se ainda estamos verificando o acesso, mantém o skeleton para não
     * piscar entre estados.
     */
    if (accessState.status === "loading") {
      return (
        <div className="pt-[76px]">
          <HomeSkeleton />
        </div>
      );
    }

    /*
     * Sem matrícula nem plano ativo → exibe vitrine de compra.
     * Com acesso mas sem trilha → exibe convite ao onboarding.
     */
    if (accessState.status === "no-access") {
      return (
        <div className="pt-[76px]">
          <HomeNoCourses courses={accessState.courses} />
        </div>
      );
    }

    return (
      <div className="pt-[76px]">
        <HomeEmptyState questionnaire={questionnaire} />
      </div>
    );
  }

  const firstName = firstNameFrom(profileRaw);
  const formattedDate = dateFormatter.format(new Date());
  const today = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const greeting = `${firstName ? `Olá, ${firstName}` : "Olá"} · ${today}`;

  /*
   * Derivado, não estado: itens pendentes marcados como remarcados. O aviso some
   * sozinho conforme a pessoa os conclui, em vez de depender de uma flag de sessão.
   */
  const rescheduledCount = state.trail.items.filter(
    (item) => item.status === "pending" && item.rescheduled,
  ).length;

  return (
    /*
     * `isolate` prende o `-z-10` do fundo do herói a esta árvore: a mancha fica
     * atrás do conteúdo da home sem cair atrás do gradiente ambiente do RouteShell.
     */
    <div className="relative isolate pt-[76px]">
      {rescheduledCount > 0 && (
        <div className="editorial-container pt-6">
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Alguns conteúdos foram remarcados</Alert.Title>
              <Alert.Description>
                <span data-numeric>{rescheduledCount}</span>{" "}
                {rescheduledCount === 1 ? "conteúdo voltou" : "conteúdos voltaram"} para os próximos
                dias da sua rotina. Nada foi perdido.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      {state.kind === "dia-pronto" && state.session.nextStep ? (
        <>
          <NextStepHero
            session={state.session}
            nextStep={state.session.nextStep}
            greeting={greeting}
          />
          <SessionRest session={state.session} excludeId={state.session.nextStep.id} />
        </>
      ) : (
        <DayCompleteHero
          greeting={greeting}
          session={state.kind === "dia-concluido" ? state.session : null}
          next={state.kind === "dia-concluido" ? state.next : null}
        />
      )}

      {/*
       * Um cartão de recalibração por vez, e nunca antes de estudar — a regra
       * vive em `pickRecalibration`, não aqui.
       */}
      <RecalibrationSlot
        // Remonta ao trocar de pergunta para o estado de seleção não vazar de uma
        // recalibração para a seguinte.
        key={recalibration?.kind === "survey" ? recalibration.question.id : recalibration?.kind ?? "none"}
        recalibration={recalibration}
        onFeedback={handleFeedback}
        onAnswerSurvey={handleAnswerSurvey}
        outcome={outcome}
      />

      {/*
       * A prática do dia só aparece depois que a sessão fecha. Antes ela era um
       * quarto botão primário disputando a atenção com o próprio estudo.
       */}
      {state.kind === "dia-concluido" && dailyPill && (
        <section className="editorial-container pb-[clamp(2rem,4vw,3rem)]">
          <Rise>
            <DailyPill 
              pillId={dailyPill.id}
              title={dailyPill.title}
              challenge={dailyPill.challenge}
            />
          </Rise>
        </section>
      )}

      <WhyThisTrail chips={profileChips} />

      {stats && <StudyLedger stats={stats} />}

      <DiscoverySection courses={discovery} personalized={profileChips.length > 0} />
    </div>
  );
}
