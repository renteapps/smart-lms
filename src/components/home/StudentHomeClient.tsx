"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Alert } from "@heroui/react/alert";
import { Skeleton } from "@heroui/react/skeleton";
import { applySessionFeedback, generateLearningTrail, replanLearningTrail } from "@/lib/matching";
import { refreshTrail, setTrailItemCompletion } from "@/app/actions/trail";
import { saveLearningTrail } from "@/lib/trailStorage";
import { notifyTrailChanged, useStoredValue, useTrailStore } from "@/lib/useTrailStore";
import { recordTrailEvent } from "@/lib/trailAnalytics";
import {
  deriveImplicitSignals,
  deriveProfileSummary,
  rankCatalogByAffinity,
  selectHomeState,
} from "@/lib/studentHome";
import {
  pickRecalibration,
  readRefinementState,
  recordSurveyAnswer,
  recordSurveyShown,
  REFINEMENT_STORAGE_KEY,
} from "@/lib/refinementSurveys";
import RecalibrationSlot from "@/components/home/RecalibrationSlot";
import type { LearningTrailItem, Questionnaire, SessionLoadRating } from "@/types/trilha";
import type { CatalogCourse, ContinueLesson } from "@/types/course";
import type { Article } from "@/types/blog";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { PROFILE_STORAGE_KEY, PROFILE_SAVED_EVENT } from "@/lib/profilePreferences";
import DailyPill from "@/components/DailyPill";
import DayCompleteHero from "@/components/home/DayCompleteHero";
import DiscoverySection from "@/components/home/DiscoverySection";
import HomeEmptyState from "@/components/home/HomeEmptyState";
import HomeNoCourses from "@/components/home/HomeNoCourses";
import ContinueWatchingCarousel from "@/components/home/ContinueWatchingCarousel";
import MasterclassCarousel from "@/components/home/MasterclassCarousel";
import NextStepHero from "@/components/home/NextStepHero";
import SessionRest from "@/components/home/SessionRest";
import { Rise } from "@/components/ui/Rise";
import { HomeBlogSection } from "@/components/blog/HomeBlogSection";
import type { HomeCarouselRow } from "@/types/course";

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
export default function StudentHomeClient({
  courses,
  articles = [],
  masterclassRows = [],
  continueLessons = [],
}: {
  courses: CatalogCourse[];
  articles?: Article[];
  masterclassRows?: HomeCarouselRow[];
  continueLessons?: ContinueLesson[];
}) {
  const { hydrated, trail, error, migrated } = useTrailStore();
  /*
   * O questionário vem do banco, e só dele.
   *
   * A home lia a versão guardada no dispositivo, que cai no questionário de
   * exemplo quando não existe nada gravado — e aí o slot de recalibração
   * chegava a piscar "esta pergunta é nova" com uma pergunta que não existe no
   * produto. Enquanto o servidor não responde, `null`: nenhuma pergunta é
   * melhor do que uma pergunta inventada.
   */
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const { dailyPill, profileTests, loading } = useSupabaseData();
  const profileRaw = useSyncExternalStore(subscribeToProfile, readProfileRaw, noProfile);
  const refinementRaw = useStoredValue(REFINEMENT_STORAGE_KEY);
  /** O que a última recalibração mudou — some na próxima navegação, de propósito. */
  const [outcome, setOutcome] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const state = useMemo(() => selectHomeState(trail), [trail]);

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

  /*
   * Uma vez por visita, o servidor põe a trilha em dia: tira o que já foi
   * concluído fora da agenda, traz o conteúdo que o admin mapeou depois de a
   * pessoa ter respondido, e redistribui os dias em branco. O replanejamento
   * local acima continua valendo como rede — ele funciona offline e cobre a
   * trilha que ainda só existe neste dispositivo.
   */
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    refreshTrail()
      .then((result) => {
        if (cancelled || !result.success) return;
        if (result.questionnaire) setQuestionnaire(result.questionnaire);
        if (!result.trail) return;
        saveLearningTrail(result.trail);
        notifyTrailChanged();
        if (result.notice?.summary) setOutcome(result.notice.summary);
      })
      .catch(() => {
        // Sem rede a home segue com o que está no dispositivo.
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  // `state` já foi derivado acima junto com `accessState` para evitar duplicação.
  const profileChips = useMemo(
    () => (trail ? deriveProfileSummary(trail, questionnaire) : []),
    [trail, questionnaire],
  );
  const discovery = useMemo(() => {
    const featured = courses
      .filter((c) => c.isFeatured)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    
    if (featured.length >= 3) {
      return featured.slice(0, 3);
    }

    const featuredIds = new Set(featured.map(c => c.id));
    const remainingSlots = 3 - featured.length;

    const affinityCourses = rankCatalogByAffinity<CatalogCourse>(courses, trail, questionnaire)
      .filter(c => !featuredIds.has(c.id))
      .slice(0, remainingSlots);

    return [...featured, ...affinityCourses];
  }, [courses, trail, questionnaire]);

  const discoverableArticles = useMemo(() => {
    if (!trail) return articles.slice(0, 4);
    
    const trailArticleSlugs = new Set(
      trail.items
        .filter(item => item.type === "article" && item.slug)
        .map(item => item.slug)
    );

    return articles.filter(article => !trailArticleSlugs.has(article.slug)).slice(0, 4);
  }, [articles, trail]);

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

  /*
   * Uma pergunta nova ainda sem resposta tem prioridade sobre tudo, mas não
   * precisa insistir em toda visita: assim que o card aparece, marcamos a hora.
   * `pickRecalibration` lê essa marca na próxima chamada e espaça as próximas
   * exibições em alguns dias — sem isso, o card voltaria a cada carregamento da
   * home até a pessoa responder.
   */
  useEffect(() => {
    if (recalibration?.kind === "survey" && recalibration.isNew) {
      recordSurveyShown(recalibration.question.id);
    }
  }, [recalibration]);

  /** Conclusão declarada pelo aluno para conteúdo que abre fora da plataforma. */
  const handleCompleteContent = useCallback(async (item: LearningTrailItem) => {
    setCompletingId(item.id);
    try {
      const result = await setTrailItemCompletion(item.id, true);
      if (result.success && result.trail) {
        saveLearningTrail(result.trail);
        notifyTrailChanged();
        setOutcome(`“${item.title}” entrou no seu progresso.`);
      }
    } finally {
      setCompletingId(null);
    }
  }, []);

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
      /*
       * A rotina passada é a **declarada**: `generateLearningTrail` já aplica a
       * meta adaptada por cima na hora de agendar. Passar a adaptada aqui
       * gravava o valor temporário como se a pessoa tivesse escolhido ele.
       */
      const updated = generateLearningTrail(
        trail.userId,
        answers,
        questionnaire,
        trail.availability,
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
     * Sem matrícula nem plano ativo → exibe vitrine de compra.
     * Com acesso mas sem trilha → exibe convite ao onboarding.
     */
    const hasCourseAccess = courses.some((course) => course.studentState?.kind !== "locked");
    if (!hasCourseAccess) {
      return (
        <div className="pt-[76px]">
          <HomeNoCourses courses={courses} />
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
            onComplete={handleCompleteContent}
            isCompleting={completingId === state.session.nextStep.id}
          />
          <SessionRest
            session={state.session}
            excludeId={state.session.nextStep.id}
            onComplete={handleCompleteContent}
            completingId={completingId}
          />
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

      <ContinueWatchingCarousel lessons={continueLessons} />

      <MasterclassCarousel rows={masterclassRows} />

      <HomeBlogSection articles={discoverableArticles} />

      <DiscoverySection courses={discovery} personalized={profileChips.length > 0} />
    </div>
  );
}
