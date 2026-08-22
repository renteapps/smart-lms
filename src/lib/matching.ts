import {
  EligibleLesson,
  LearningRole,
  LearningTrail,
  LearningTrailItem,
  Questionnaire,
  ResolvedContent,
  SessionLoadRating,
  StudyAvailability,
  Weekday,
} from '@/types/trilha';
import { EMPTY_CONTENT_INDEX, type ContentIndex, type ContentResolver } from '@/lib/contentCatalog';

type UserAnswers = Record<string, string[]>;
type Candidate = ResolvedContent & {
  score: number;
  learningRole: LearningRole;
  firstSeen: number;
  reasons: Set<string>;
  warnings: string[];
};

const rolePriority: Record<LearningRole, number> = {
  essential: 0,
  deepening: 1,
  extra: 2,
};

export const DEFAULT_AVAILABILITY: StudyAvailability = {
  weekdays: [1, 3, 5],
  minutesPerSession: 30,
  mode: 'uniform',
};

/** Limites duros da meta diária: a UI, o admin e o motor usam os mesmos. */
export const MIN_SESSION_MINUTES = 10;
export const MAX_SESSION_MINUTES = 240;

/**
 * Tolerância de ±20% entre o tempo que a pessoa tem e o que o dia recebe.
 *
 * Sem folga, o encaixe é perfeito e o plano é ruim: uma aula de 35 minutos numa
 * meta de 30 empurrava a semana inteira para frente, e um dia fechado com 12 dos
 * 30 minutos disponíveis desperdiçava a rotina que a pessoa reservou. Com a
 * folga, um dia é considerado bem montado quando fica entre 80% e 120% da meta
 * — abaixo disso o motor continua puxando conteúdo, acima ele para.
 */
export const BUDGET_TOLERANCE = 0.2;

export function clampSessionMinutes(value: number): number {
  const rounded = Math.round(Number(value) || 0);
  if (!rounded) return DEFAULT_AVAILABILITY.minutesPerSession;
  return Math.max(MIN_SESSION_MINUTES, Math.min(MAX_SESSION_MINUTES, rounded));
}

/**
 * Rotina saneada: dias sem duplicata, minutos dentro dos limites e, no modo por
 * dia, um valor explícito para cada dia escolhido. Todo o resto do motor assume
 * que passou por aqui.
 */
export function normalizeAvailability(availability: StudyAvailability): StudyAvailability {
  const unique = [...new Set(availability.weekdays || [])].sort((a, b) => a - b) as Weekday[];
  const weekdays = unique.length > 0 ? unique : DEFAULT_AVAILABILITY.weekdays;
  const minutesPerSession = clampSessionMinutes(availability.minutesPerSession);

  if (availability.mode !== 'per_day') {
    return { weekdays, minutesPerSession, mode: 'uniform' };
  }

  const minutesByWeekday: Partial<Record<Weekday, number>> = {};
  weekdays.forEach((weekday) => {
    minutesByWeekday[weekday] = clampSessionMinutes(
      availability.minutesByWeekday?.[weekday] ?? minutesPerSession,
    );
  });

  return { weekdays, minutesPerSession, mode: 'per_day', minutesByWeekday };
}

/** Meta de um dia específico — o mesmo número no modo uniforme, o do dia no modo por dia. */
export function minutesForWeekday(availability: StudyAvailability, weekday: Weekday): number {
  const declared = availability.mode === 'per_day'
    ? availability.minutesByWeekday?.[weekday]
    : undefined;
  return clampSessionMinutes(declared ?? availability.minutesPerSession);
}

/** Soma da semana: no modo por dia, a soma real; no uniforme, dias × minutos. */
export function weeklyMinutes(availability: StudyAvailability): number {
  const routine = normalizeAvailability(availability);
  return routine.weekdays.reduce<number>(
    (total, weekday) => total + minutesForWeekday(routine, weekday),
    0,
  );
}

/** Encolhe ou aumenta a rotina inteira mantendo a proporção entre os dias. */
export function scaleAvailability(availability: StudyAvailability, factor: number): StudyAvailability {
  const routine = normalizeAvailability(availability);
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return routine;

  const scaled: StudyAvailability = {
    ...routine,
    minutesPerSession: clampSessionMinutes(routine.minutesPerSession * factor),
  };

  if (routine.mode === 'per_day' && routine.minutesByWeekday) {
    scaled.minutesByWeekday = Object.fromEntries(
      Object.entries(routine.minutesByWeekday).map(([weekday, minutes]) => [
        weekday,
        clampSessionMinutes((minutes ?? routine.minutesPerSession) * factor),
      ]),
    ) as Partial<Record<Weekday, number>>;
  }

  return scaled;
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromLocalDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function nextPreferredDate(from: Date, weekdays: Weekday[], includeFrom = true): Date {
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  if (!includeFrom) cursor.setDate(cursor.getDate() + 1);

  for (let offset = 0; offset < 14; offset += 1) {
    if (weekdays.includes(cursor.getDay() as Weekday)) return cursor;
    cursor.setDate(cursor.getDate() + 1);
  }
  return cursor;
}

/**
 * Sem índice explícito, cai no catálogo vazio — nunca em dados mock.
 *
 * Um fallback silencioso para mock já causou trilhas geradas com ids que não
 * existem no Supabase; melhor a trilha vir vazia (visível) do que errada.
 */
function normalizeIndex(indexOrResolver?: ContentIndex | ContentResolver): ContentIndex {
  if (!indexOrResolver) return EMPTY_CONTENT_INDEX;
  if (typeof indexOrResolver === 'function') {
    return { ...EMPTY_CONTENT_INDEX, resolve: indexOrResolver };
  }
  return indexOrResolver;
}



export function validateQuestionnaire(
  questionnaire: Questionnaire,
  indexOrResolver?: ContentIndex | ContentResolver,
): string[] {
  const index = normalizeIndex(indexOrResolver);
  const errors: string[] = [];
  const availabilityQuestions = questionnaire.questions.filter((question) => question.type === 'availability');

  if (availabilityQuestions.length !== 1) errors.push('Mantenha exatamente uma pergunta de disponibilidade.');
  if (questionnaire.questions.at(-1)?.type !== 'availability') errors.push('A disponibilidade precisa ser a última pergunta.');

  questionnaire.questions.forEach((question) => {
    if (question.type === 'availability') return;
    if (question.options.length === 0) errors.push(`A pergunta “${question.text}” precisa ter ao menos uma opção.`);
    question.options.forEach((option) => {
      option.contentMappings?.forEach((mapping) => {
        const resolved = index.resolve(mapping);
        if (resolved.length === 0) errors.push(`“${mapping.title}” não pôde ser encontrado ou expandido.`);
        if ((mapping.type === 'article' || mapping.type === 'external_link') && !mapping.estimatedDurationMin) {
          errors.push(`Informe a duração estimada de “${mapping.title}”.`);
        }
      });
    });
  });

  return [...new Set(errors)];
}

/**
 * Fração somada ao score por acerto de afinidade.
 *
 * Deliberadamente pequena: afinidade **desempata**, nunca decide. Como a
 * ordenação olha `rolePriority` antes do score, ela também não consegue
 * promover um `extra` acima de um `essential` mapeado pelo admin.
 */
const AFFINITY_WEIGHT = 0.1;
/** Mínimo para um conteúdo não mapeado entrar sozinho: um acerto de tópico ou problema. */
const AFFINITY_ENTRY_THRESHOLD = 2;

type AffinitySignal = { tag: string; label: string };

/** Exportada para o editor do admin normalizar tags do mesmo jeito que o motor de afinidade compara. */
export function normalizeTag(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** As tags que o admin já autorou nas opções que a pessoa marcou. */
function collectAffinitySignals(answers: UserAnswers, questionnaire: Questionnaire): AffinitySignal[] {
  const signals: AffinitySignal[] = [];

  questionnaire.questions.forEach((question) => {
    if (question.type === 'availability') return;
    const selected = answers[question.id] || [];
    question.options.forEach((option) => {
      if (!selected.includes(option.label)) return;
      (option.tags || []).forEach((tag) => signals.push({ tag: normalizeTag(tag), label: option.label }));
    });
  });

  return signals;
}

function scoreAffinity(lesson: EligibleLesson, signals: AffinitySignal[]): { score: number; label: string | null } {
  const topics = new Set((lesson.topics || []).map(normalizeTag));
  const problems = new Set((lesson.problemasQueResolve || []).map(normalizeTag));
  const level = normalizeTag(lesson.nivel);

  let score = 0;
  let label: string | null = null;

  signals.forEach((signal) => {
    if (topics.has(signal.tag) || problems.has(signal.tag)) {
      score += 2;
      label = label ?? signal.label;
    } else if (level === signal.tag) {
      score += 1;
      label = label ?? signal.label;
    }
  });

  return { score, label };
}

/**
 * Aplica a afinidade sobre os candidatos já coletados.
 *
 * O motor original só enxergava conteúdo **explicitamente mapeado** por um admin
 * numa opção de resposta: `tags`, `topics`, `nivel` e `problemasQueResolve` eram
 * preenchidos na tela de curadoria e nunca lidos. Na prática, um curso novo só
 * entrava na trilha de alguém se alguém o mapeasse à mão — o oposto de
 * automático, e insustentável com muitos cursos.
 *
 * Aqui esses metadados finalmente pesam: reforçam o score de quem já é candidato
 * e deixam conteúdo não mapeado entrar como `extra`. Só entra sozinho quem já tem
 * os pré-requisitos cobertos — puxar uma cadeia inteira de dependências por causa
 * de um "extra" inflaria a trilha sem que ninguém tenha pedido.
 */
function applyAffinity(
  candidates: Map<string, Candidate>,
  signals: AffinitySignal[],
  catalog: EligibleLesson[],
  resolver: ContentResolver,
  seenOrder: number,
): void {
  if (signals.length === 0) return;
  let order = seenOrder;

  catalog.forEach((lesson) => {
    const { score, label } = scoreAffinity(lesson, signals);
    if (score === 0 || !label) return;

    const existing = candidates.get(lesson.lessonId);
    if (existing) {
      existing.score += score * AFFINITY_WEIGHT;
      return;
    }

    if (score < AFFINITY_ENTRY_THRESHOLD) return;
    const prerequisitesReady = (lesson.prerequisitos || []).every((id) => candidates.has(id));
    if (!prerequisitesReady) return;

    const [content] = resolver({
      id: lesson.lessonId,
      type: 'lesson',
      title: lesson.title,
      learningRole: 'extra',
    });
    if (!content) return;

    candidates.set(lesson.lessonId, {
      ...content,
      score: score * AFFINITY_WEIGHT,
      learningRole: 'extra',
      firstSeen: order,
      reasons: new Set([`seu interesse em ${label}`]),
      warnings: [],
    });
    order += 1;
  });
}

function collectCandidates(
  answers: UserAnswers,
  questionnaire: Questionnaire,
  index: ContentIndex,
): Candidate[] {
  const resolver: ContentResolver = index.resolve;
  const catalog: EligibleLesson[] = index.eligibleLessons;
  const candidates = new Map<string, Candidate>();
  let seenOrder = 0;

  questionnaire.questions.forEach((question) => {
    const selected = answers[question.id] || [];
    if (question.type === 'availability' || selected.length === 0) return;

    question.options.forEach((option) => {
      if (!selected.includes(option.label)) return;
      const weight = option.weight || 1;
      (option.contentMappings || []).forEach((mapping) => {
        resolver(mapping).forEach((content) => {
          const existing = candidates.get(content.id);
          if (existing) {
            existing.score += weight;
            existing.reasons.add(option.label);
            if (rolePriority[mapping.learningRole] < rolePriority[existing.learningRole]) {
              existing.learningRole = mapping.learningRole;
            }
            return;
          }

          candidates.set(content.id, {
            ...content,
            score: weight,
            learningRole: mapping.learningRole,
            firstSeen: seenOrder,
            reasons: new Set([option.label]),
            warnings: [],
          });
          seenOrder += 1;
        });
      });
    });
  });

  // Antes da varredura de pré-requisitos: o que a afinidade trouxer também
  // precisa ter suas dependências resolvidas e entrar na ordenação topológica.
  applyAffinity(candidates, collectAffinitySignals(answers, questionnaire), catalog, resolver, seenOrder);

  const ensurePrerequisite = (id: string, inheritedScore: number, path: string[]): void => {
    if (path.includes(id)) {
      const cyclic = candidates.get(path.at(-1) || id);
      cyclic?.warnings.push(`Ciclo de pré-requisitos detectado: ${[...path, id].join(' → ')}`);
      return;
    }

    let candidate = candidates.get(id);
    if (!candidate) {
      const mapping = index.mappingFor(id);
      const content = mapping ? resolver(mapping)[0] : undefined;
      if (!content) {
        const dependent = candidates.get(path.at(-1) || '');
        dependent?.warnings.push(`Pré-requisito ${id} não encontrado.`);
        return;
      }
      candidate = {
        ...content,
        score: inheritedScore,
        learningRole: 'essential',
        firstSeen: -1,
        reasons: new Set(['Pré-requisito da sua sequência']),
        warnings: [],
      };
      candidates.set(id, candidate);
    }
    candidate.prerequisites?.forEach((prerequisiteId) => ensurePrerequisite(prerequisiteId, candidate!.score, [...path, id]));
  };

  [...candidates.values()].forEach((candidate) => {
    candidate.prerequisites?.forEach((id) => ensurePrerequisite(id, candidate.score, [candidate.id]));
  });

  const sorted = [...candidates.values()].sort((a, b) =>
    rolePriority[a.learningRole] - rolePriority[b.learningRole]
    || b.score - a.score
    || a.firstSeen - b.firstSeen
    || a.title.localeCompare(b.title),
  );

  const ordered: Candidate[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (candidate: Candidate) => {
    if (visited.has(candidate.id)) return;
    if (visiting.has(candidate.id)) {
      candidate.warnings.push('Ciclo de pré-requisitos ignorado para manter a trilha disponível.');
      return;
    }
    visiting.add(candidate.id);
    candidate.prerequisites?.forEach((id) => {
      const prerequisite = candidates.get(id);
      if (prerequisite) visit(prerequisite);
      else candidate.warnings.push(`Pré-requisito ${id} não encontrado.`);
    });
    visiting.delete(candidate.id);
    visited.add(candidate.id);
    ordered.push(candidate);
  };

  sorted.forEach(visit);
  return ordered;
}

type QueueEntry = { item: LearningTrailItem; position: number };

/**
 * Chave de sequência: dentro de um curso (ou módulo solto) a ordem é intocável.
 *
 * É o que permite "dividir o curso pelo tempo das aulas" sem embaralhar a
 * didática: o motor pode adiantar um artigo ou uma aula de outro curso para
 * fechar um dia, mas nunca a aula 5 antes da aula 3 do mesmo curso.
 *
 * Sem `sequence` — o caso do curso galeria, uma coleção de avulsas — `comesFirst`
 * cai na posição da fila, que é a ordem da curadoria. As aulas continuam sem se
 * ultrapassar, só que obedecendo a quem o admin pôs na frente.
 */
function sequenceKeyOf(item: LearningTrailItem): string | null {
  return item.courseId || item.moduleId || null;
}

function comesFirst(a: QueueEntry, b: QueueEntry): boolean {
  const left = a.item.sequence;
  const right = b.item.sequence;
  if (typeof left === 'number' && typeof right === 'number' && left !== right) return left < right;
  return a.position < b.position;
}

/** Liberado = nada que precisa vir antes dele continua na fila. */
function isReleased(entry: QueueEntry, index: number, queue: QueueEntry[], queuedIds: Set<string>): boolean {
  const blockedByPrerequisite = entry.item.prerequisites?.some(
    (id) => id !== entry.item.id && queuedIds.has(id),
  );
  if (blockedByPrerequisite) return false;

  const key = sequenceKeyOf(entry.item);
  if (!key) return true;

  return !queue.some((other, otherIndex) => (
    otherIndex !== index
    && sequenceKeyOf(other.item) === key
    && comesFirst(other, entry)
  ));
}

function capacityFor(budget: number): number {
  return Math.round(budget * (1 + BUDGET_TOLERANCE));
}

/**
 * Distribui o que está pendente pelos dias da rotina.
 *
 * O agendador antigo era uma fila cega: pegava o próximo item, e se ele não
 * coubesse no que restava do dia, fechava o dia e abria o seguinte. Com meta de
 * 30 minutos, uma aula de 32 sozinha empurrava a semana inteira, e um dia
 * fechado com 12 minutos usados desperdiçava a rotina reservada.
 *
 * Agora cada dia tem meta própria (`minutesForWeekday`) e uma faixa de ±20%: o
 * motor continua puxando conteúdo enquanto o dia estiver abaixo de 80% da meta e
 * aceita qualquer item que caiba em até 120%.
 *
 * A ordem da curadoria, porém, vem antes do encaixe. Cada sessão abre com o
 * primeiro conteúdo liberado da fila — se ele for maior que a meta, o dia fica
 * maior, e é só isso que acontece. Só depois o motor procura adiante quem caiba
 * no tempo que sobrou, respeitando pré-requisitos e a sequência do curso. Assim
 * o dia continua sendo bem aproveitado sem que uma aula longa possa ser
 * ultrapassada por aulas curtas até o fim do plano; quem furou a meta sai
 * marcado `overBudget` e o card avisa antes da pessoa começar.
 */
export function schedulePendingItems(
  items: LearningTrailItem[],
  availability: StudyAvailability,
  startDate = new Date(),
): LearningTrailItem[] {
  const routine = normalizeAvailability(availability);
  const done = items.filter((item) => item.status === 'completed');
  const queue: QueueEntry[] = items
    .filter((item) => item.status !== 'completed')
    .map((item, position) => ({ item, position }));

  const scheduled: LearningTrailItem[] = [];
  const queuedIds = new Set(queue.map((entry) => entry.item.id));

  const doneBudgetPerDate = new Map<string, number>();
  done.forEach((item) => {
    let dateKey = item.scheduledDate;
    if (item.completedAt) {
      const at = new Date(item.completedAt);
      if (!Number.isNaN(at.getTime())) dateKey = toLocalDateKey(at);
    }
    if (dateKey) {
      doneBudgetPerDate.set(dateKey, (doneBudgetPerDate.get(dateKey) || 0) + item.durationMin);
    }
  });

  let cursor = nextPreferredDate(startDate, routine.weekdays);
  let sessionNumber = 1;

  const place = (index: number, dateKey: string, sessionId: string, capacity: number): LearningTrailItem => {
    const [entry] = queue.splice(index, 1);
    queuedIds.delete(entry.item.id);
    const placed: LearningTrailItem = {
      ...entry.item,
      scheduledDate: dateKey,
      sessionId,
      overBudget: entry.item.durationMin > capacity,
      // `index > 0`: passou na frente de alguém que continuou na fila.
      movedForFit: index > 0 || undefined,
    };
    scheduled.push(placed);
    return placed;
  };

  // Limite de segurança: 1000 dias de rotina é mais do que qualquer trilha real.
  for (let day = 0; queue.length > 0 && day < 1000; day += 1) {
    const dateKey = toLocalDateKey(cursor);
    const sessionId = `${dateKey}-${sessionNumber}`;
    const budget = minutesForWeekday(routine, cursor.getDay() as Weekday);
    const capacity = capacityFor(budget);
    const floor = Math.round(budget * (1 - BUDGET_TOLERANCE));
    let used = doneBudgetPerDate.get(dateKey) || 0;

    /*
     * A vez é de quem está na frente: o primeiro liberado abre a sessão, caiba
     * ele na meta do dia ou não.
     *
     * Esta é a regra que a duração não pode dobrar. Enquanto o dia era montado
     * só por encaixe, um conteúdo que não coubesse na meta era pulado — e
     * sempre havia algo mais curto de outro curso para pôr no lugar. Numa
     * rotina de 20 minutos, uma coleção de masterclasses de 23 a 63 minutos ia
     * sendo empurrada uma semana por aula enquanto aulas curtas passavam na
     * frente; a sequência que a curadoria montou para o aluno chegava
     * embaralhada, e a aula mais longa terminava no fim do plano.
     *
     * Agora ela entra no lugar dela e o dia estoura a meta — uma vez, de forma
     * visível: `overBudget` é o que faz o card avisar que hoje é mais longo.
     * Só o primeiro item pode furar a meta; o preenchimento abaixo nunca passa
     * da capacidade do dia.
     */
    if (used === 0 && queue.length > 0) {
      const head = queue.findIndex((entry, position) => isReleased(entry, position, queue, queuedIds));
      // `-1` só em ciclo de pré-requisitos: um defeito de curadoria não pode
      // travar o plano, então o primeiro da fila entra mesmo bloqueado.
      used += place(head === -1 ? 0 : head, dateKey, sessionId, capacity).durationMin;
    }

    // O resto do dia é preenchido com quem couber no que sobrou — isso adianta
    // conteúdo de outros cursos, mas nunca atrasa quem já passou por aqui.
    while (used < floor) {
      const index = queue.findIndex((entry, position) => (
        isReleased(entry, position, queue, queuedIds)
        && used + entry.item.durationMin <= capacity
      ));
      if (index === -1) break;
      used += place(index, dateKey, sessionId, capacity).durationMin;
    }

    cursor = nextPreferredDate(cursor, routine.weekdays, false);
    sessionNumber += 1;
  }

  // O limite de segurança nunca pode fazer conteúdo desaparecer da trilha.
  const overflowDate = toLocalDateKey(cursor);
  queue.forEach((entry) => {
    scheduled.push({
      ...entry.item,
      scheduledDate: overflowDate,
      sessionId: `${overflowDate}-${sessionNumber}`,
    });
  });

  return [...done, ...scheduled].map((item, index) => ({ ...item, order: index + 1 }));
}

/**
 * @param completedContentIds conteúdo que a pessoa já concluiu **fora** da trilha
 * (progresso da sala de aula). Nunca volta para a agenda: refazer os objetivos
 * muda o que vem pela frente, não o que já foi visto.
 */
export function generateLearningTrail(
  userId: string,
  answers: UserAnswers,
  questionnaire: Questionnaire,
  availability: StudyAvailability,
  existingTrail?: LearningTrail | null,
  startDate = new Date(),
  indexOrResolver?: ContentIndex | ContentResolver,
  completedContentIds: Iterable<string> = [],
): LearningTrail {
  const index = normalizeIndex(indexOrResolver);
  const existingCompleted = new Map(
    (existingTrail?.items || []).filter((item) => item.status === 'completed').map((item) => [item.id, item]),
  );
  const alreadySeen = new Set([...completedContentIds, ...existingCompleted.keys()]);

  const candidates = collectCandidates(answers, questionnaire, index);
  const draftItems: LearningTrailItem[] = candidates.filter(
    (candidate) => !alreadySeen.has(candidate.id),
  ).map((candidate, index) => {
    return {
      id: candidate.id,
      type: candidate.type,
      title: candidate.title,
      durationMin: candidate.durationMin,
      courseId: candidate.courseId,
      courseName: candidate.courseName,
      moduleId: candidate.moduleId,
      moduleName: candidate.moduleName,
      slug: candidate.slug,
      url: candidate.url,
      cover: candidate.cover,
      shortDescription: candidate.shortDescription,
      prerequisites: candidate.prerequisites,
      sequence: candidate.sequence,
      order: index + 1,
      reason: candidate.reasons.size > 1
        ? `Conecta ${[...candidate.reasons].slice(0, 2).join(' e ')}`
        : `Recomendado por: ${[...candidate.reasons][0]}`,
      score: candidate.score,
      learningRole: candidate.learningRole,
      status: 'pending',
      scheduledDate: '',
      sessionId: '',
      warnings: candidate.warnings.length > 0 ? candidate.warnings : undefined,
    };
  });

  /*
   * Conteúdo concluído que deixou de ser recomendado continua na trilha.
   *
   * O mapa acima só preservava o que voltasse a ser candidato: mudar uma resposta
   * apagava do histórico tudo que a nova combinação não mapeia. Como as pesquisas
   * de recalibração regeneram a trilha com frequência, isso derrubaria sequência,
   * minutos estudados e percentual concluído a cada ajuste — a pessoa perderia
   * trabalho que realmente fez. Recalibrar muda o que vem pela frente, nunca o
   * que já passou.
   */
  const orderedItems = [...existingCompleted.values(), ...draftItems].map((item, index) => ({
    ...item,
    order: index + 1,
  }));

  const declared = normalizeAvailability(availability);
  const items = schedulePendingItems(
    orderedItems,
    adaptedRoutine(declared, existingTrail?.adaptiveMinutesPerSession),
    startDate,
  );

  return {
    formatVersion: 3,
    userId,
    items,
    generatedAt: Date.now(),
    questionnaireVersion: questionnaire.version,
    answers,
    availability: declared,
    adaptiveMinutesPerSession: existingTrail?.adaptiveMinutesPerSession,
    missedSessions: existingTrail?.missedSessions,
    feedbackHistory: existingTrail?.feedbackHistory || [],
  };
}

/**
 * A meta adaptada é lida como razão sobre a declarada, e a razão escala todos os
 * dias. Assim uma rotina de tempos diferentes ("30 na terça, 90 no sábado")
 * encolhe proporcionalmente quando o comportamento pede — em vez de achatar
 * tudo num único número, que era o que `adaptiveMinutesPerSession` fazia.
 */
function adaptedRoutine(declared: StudyAvailability, adaptiveMinutes?: number): StudyAvailability {
  if (!adaptiveMinutes) return declared;
  return scaleAvailability(declared, adaptiveMinutes / declared.minutesPerSession);
}

/** A rotina que o motor realmente usa para planejar: a declarada, já adaptada. */
export function effectiveAvailability(trail: LearningTrail): StudyAvailability {
  return adaptedRoutine(normalizeAvailability(trail.availability), trail.adaptiveMinutesPerSession);
}

export function updateTrailAvailability(
  trail: LearningTrail,
  availability: StudyAvailability,
  startDate = new Date(),
): LearningTrail {
  const normalized = normalizeAvailability(availability);
  return {
    ...trail,
    availability: normalized,
    // Rotina redeclarada: o que o motor tinha adaptado sozinho perde a validade.
    adaptiveMinutesPerSession: undefined,
    missedSessions: 0,
    items: schedulePendingItems(trail.items, normalized, startDate),
    replannedAt: Date.now(),
  };
}

/**
 * Conteúdo concluído fora da agenda — na sala de aula, num link externo — não
 * pode continuar pendente na trilha. Sem isso, a pessoa via de novo, no plano de
 * hoje, uma aula que já tinha assistido ontem por conta própria.
 */
export function syncTrailCompletion(
  trail: LearningTrail,
  completedContentIds: Iterable<string>,
  now = new Date(),
): { trail: LearningTrail; changed: boolean; completed: number } {
  const completedIds = new Set(completedContentIds);
  const pendingDone = trail.items.filter(
    (item) => item.status === 'pending' && completedIds.has(item.id),
  );
  if (pendingDone.length === 0) return { trail, changed: false, completed: 0 };

  const completedAt = now.toISOString();
  const items = trail.items.map((item) => (
    item.status === 'pending' && completedIds.has(item.id)
      ? {
        ...item,
        status: 'completed' as const,
        completedAt: item.completedAt || completedAt,
        scheduledDate: item.scheduledDate || toLocalDateKey(now),
      }
      : item
  ));

  return { trail: { ...trail, items }, changed: true, completed: pendingDone.length };
}

export function applySessionFeedback(
  trail: LearningTrail,
  sessionId: string,
  rating: SessionLoadRating,
  now = new Date(),
): LearningTrail {
  const sessionItems = trail.items.filter((item) => item.sessionId === sessionId);
  const declared = normalizeAvailability(trail.availability);
  const previousTarget = trail.adaptiveMinutesPerSession || declared.minutesPerSession;
  const delta = rating === 'light' ? 10 : rating === 'heavy' ? -10 : 0;
  const nextTarget = clampSessionMinutes(previousTarget + delta);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const feedback = {
    sessionId,
    rating,
    submittedAt: now.toISOString(),
    plannedMinutes: sessionItems.reduce((sum, item) => sum + item.durationMin, 0),
    completedMinutes: sessionItems.filter((item) => item.status === 'completed').reduce((sum, item) => sum + item.durationMin, 0),
    previousTargetMinutes: previousTarget,
    nextTargetMinutes: nextTarget,
  };

  return {
    ...trail,
    adaptiveMinutesPerSession: nextTarget,
    // Quem avalia a sessão está de volta ao ritmo: o histórico de dias em branco zera.
    missedSessions: 0,
    feedbackHistory: [...(trail.feedbackHistory || []).filter((item) => item.sessionId !== sessionId), feedback],
    items: schedulePendingItems(trail.items, adaptedRoutine(declared, nextTarget), tomorrow),
    replannedAt: Date.now(),
  };
}

export function postponeTrailSession(trail: LearningTrail, sessionId: string): LearningTrail {
  const session = trail.items.filter((item) => item.sessionId === sessionId && item.status === 'pending');
  if (session.length === 0) return trail;
  const targetDate = session[0].scheduledDate;
  const shiftedDates = new Map<string, string>();
  const futureDates = [...new Set(trail.items
    .filter((item) => item.status === 'pending' && item.scheduledDate >= targetDate)
    .map((item) => item.scheduledDate))].sort();
  futureDates.forEach((date) => {
    shiftedDates.set(date, toLocalDateKey(nextPreferredDate(fromLocalDateKey(date), trail.availability.weekdays, false)));
  });

  return {
    ...trail,
    items: trail.items.map((item) => {
      const shifted = item.status === 'pending' ? shiftedDates.get(item.scheduledDate) : undefined;
      return shifted ? { ...item, scheduledDate: shifted, sessionId: `${shifted}-postponed`, rescheduled: true } : item;
    }),
    replannedAt: Date.now(),
  };
}

/**
 * Adia um conteúdo só, não a sessão inteira.
 *
 * "Hoje eu não faço esta aula" é diferente de "hoje eu não estudo": adiar a
 * sessão empurrava a semana inteira mesmo quando a pessoa daria conta do resto
 * do dia. Aqui o item cai no próximo dia de rotina e o que sobrou da sessão
 * continua valendo para hoje.
 *
 * A sequência do curso continua intocável: se o item adiado tem colegas do mesmo
 * curso na mesma sessão que viriam *depois* dele, eles vão junto — deixá-los para
 * trás colocaria a aula 5 antes da aula 4. Conteúdo de outros cursos no mesmo dia
 * não é afetado, e as sessões seguintes ficam onde estão.
 */
export function postponeTrailItem(trail: LearningTrail, itemId: string): LearningTrail {
  const target = trail.items.find((item) => item.id === itemId && item.status === 'pending');
  if (!target || !target.scheduledDate) return trail;

  const nextDate = toLocalDateKey(
    nextPreferredDate(fromLocalDateKey(target.scheduledDate), trail.availability.weekdays, false),
  );
  if (nextDate === target.scheduledDate) return trail;

  const key = sequenceKeyOf(target);
  const targetEntry: QueueEntry = { item: target, position: trail.items.indexOf(target) };
  const moving = new Set<string>([target.id]);

  if (key) {
    trail.items.forEach((item, position) => {
      if (item.status !== 'pending' || item.id === target.id) return;
      if (item.scheduledDate !== target.scheduledDate) return;
      if (sequenceKeyOf(item) !== key) return;
      if (comesFirst(targetEntry, { item, position })) moving.add(item.id);
    });
  }

  return {
    ...trail,
    items: trail.items.map((item) => (
      moving.has(item.id)
        ? { ...item, scheduledDate: nextDate, sessionId: `${nextDate}-postponed`, rescheduled: true }
        : item
    )),
    replannedAt: Date.now(),
  };
}

export type TrailReplanResult = {
  trail: LearningTrail;
  changed: boolean;
  /** Dias de rotina que passaram em branco e entraram nesta rodada de ajuste. */
  missedSessions: number;
  /** Nova meta diária quando o motor aliviou a carga; `null` quando não mexeu nela. */
  easedMinutes: number | null;
};

/**
 * Ajusta a trilha de quem não fez o conteúdo do dia.
 *
 * Reagendar o atrasado já existia. O que faltava era ler o que o atraso diz: um
 * dia planejado que passou sem nenhuma conclusão é um dia em branco, e dois dias
 * em branco significam que a meta declarada não cabe na semana real dessa pessoa.
 * Aí o motor encolhe a meta em 20% — a mesma tolerância que ele usa para montar
 * o dia — em vez de empilhar para sempre uma carga que ela já mostrou não dar
 * conta. Quem retoma o ritmo (avalia uma sessão ou redeclara a rotina) zera o
 * contador e volta para a meta escolhida.
 */
export function replanLearningTrail(trail: LearningTrail, startDate = new Date()): TrailReplanResult {
  const today = toLocalDateKey(startDate);
  const overdue = trail.items.filter(
    (item) => item.status === 'pending' && item.scheduledDate && item.scheduledDate < today,
  );
  if (overdue.length === 0) return { trail, changed: false, missedSessions: 0, easedMinutes: null };

  const overdueIds = new Set(overdue.map((item) => item.id));
  const studiedDays = new Set(
    trail.items
      .filter((item) => item.status === 'completed')
      .map((item) => (item.completedAt ? toLocalDateKey(new Date(item.completedAt)) : item.scheduledDate)),
  );
  const missedSessions = [...new Set(overdue.map((item) => item.scheduledDate))]
    .filter((date) => !studiedDays.has(date)).length;

  const previousMissed = trail.missedSessions ?? 0;
  const totalMissed = previousMissed + missedSessions;
  const declared = normalizeAvailability(trail.availability);
  const currentTarget = trail.adaptiveMinutesPerSession || declared.minutesPerSession;

  // A cada dois dias em branco acumulados, um alívio — não um por visita.
  const shouldEase = Math.floor(totalMissed / 2) > Math.floor(previousMissed / 2)
    && currentTarget > MIN_SESSION_MINUTES;
  const easedMinutes = shouldEase ? clampSessionMinutes(currentTarget * (1 - BUDGET_TOLERANCE)) : null;
  const nextTarget = easedMinutes ?? trail.adaptiveMinutesPerSession;

  const items = schedulePendingItems(trail.items, adaptedRoutine(declared, nextTarget), startDate)
    .map((item) => ({ ...item, rescheduled: overdueIds.has(item.id) || item.rescheduled }));

  return {
    changed: true,
    missedSessions,
    easedMinutes,
    trail: {
      ...trail,
      items,
      adaptiveMinutesPerSession: nextTarget,
      missedSessions: totalMissed,
      replannedAt: Date.now(),
    },
  };
}
