import { EligibleLesson, LearningTrail, Questionnaire } from '@/types/trilha';

type UserAnswers = Record<string, string | string[]>;

export function generateLearningTrail(
  userId: string,
  answers: UserAnswers,
  questionnaire: Questionnaire,
  pool: EligibleLesson[]
): LearningTrail {
  // 1. Extrair tags do perfil baseado nas respostas
  const userProfileTags = new Set<string>();
  let timeBudgetMin = 60; // default
  let userNivel = 'iniciante'; // default

  questionnaire.questions.forEach((q) => {
    const answer = answers[q.id];
    if (!answer) return;

    const answerArray = Array.isArray(answer) ? answer : [answer];
    
    q.options.forEach((opt) => {
      if (answerArray.includes(opt.label)) {
        // Coleta as tags
        if (opt.tags) {
          opt.tags.forEach(t => userProfileTags.add(t));
        }
        // Coleta orçamento de tempo
        if (opt.timeBudgetMin) {
          timeBudgetMin = opt.timeBudgetMin;
        }
      }
    });
  });

  // 2. Score das aulas
  const scoredLessons = pool.map((lesson) => {
    let score = 0;
    
    // Bate tópicos
    lesson.topics.forEach(t => {
      if (userProfileTags.has(t)) score += 2;
    });

    // Bate problemas
    lesson.problemasQueResolve.forEach(p => {
      if (userProfileTags.has(p)) score += 3; // peso maior para dor
    });

    // Se a aula for avançada e não temos tag de avançado, penaliza
    if (lesson.nivel === 'avancado' && !userProfileTags.has('avancado')) {
      score -= 5;
    }

    return { lesson, score };
  });

  // Filtra as que pontuaram e ordena
  let recommended = scoredLessons
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.lesson);

  // 3. Respeitar pré-requisitos (simplificado)
  // Se uma aula tem prereq e ele não está na trilha, empurramos o prereq antes
  const finalSequence: EligibleLesson[] = [];
  const addedIds = new Set<string>();

  const addLesson = (lesson: EligibleLesson) => {
    if (addedIds.has(lesson.lessonId)) return;
    
    if (lesson.prerequisitos) {
      lesson.prerequisitos.forEach(reqId => {
        const reqLesson = pool.find(l => l.lessonId === reqId);
        if (reqLesson && !addedIds.has(reqId)) {
          addLesson(reqLesson);
        }
      });
    }
    
    finalSequence.push(lesson);
    addedIds.add(lesson.lessonId);
  };

  recommended.forEach(addLesson);

  // 4. Cortar por orçamento de tempo
  let totalTime = 0;
  const timeBudgetSeconds = timeBudgetMin * 60;
  const timeCappedSequence = [];

  for (const lesson of finalSequence) {
    if (totalTime + lesson.duration <= timeBudgetSeconds) {
      timeCappedSequence.push(lesson);
      totalTime += lesson.duration;
    } else {
      break; // Estourou o tempo
    }
  }

  // 5. Formatar a saída da Trilha
  const items = timeCappedSequence.map((lesson, idx) => ({
    lessonId: lesson.lessonId,
    order: idx + 1,
    reason: `Selecionado porque foca em ${lesson.topics.join(' e ')}`,
    locked: lesson.nivel === 'avancado' // Mock: se for avançada, simulamos que precisa de upsell
  }));

  return {
    userId,
    items,
    generatedAt: Date.now(),
    questionnaireVersion: questionnaire.version
  };
}
