import type { ProfileTestAccessType, ProfileTestStatus } from '@/types/profileTest';

/** Slug curto e numérico usado no link compartilhável /diagnostico/:slug. */
const SLUG_PATTERN = /^[0-9]{6,12}$/;

export function isProfileTestSlug(value: string | null | undefined): boolean {
  return typeof value === 'string' && SLUG_PATTERN.test(value);
}

/**
 * Aceita o que o admin digitou e devolve um slug válido, ou `null` quando o
 * campo está vazio — nesse caso quem gera é o default da tabela.
 */
export function normalizeProfileTestSlug(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  return SLUG_PATTERN.test(digits) ? digits : null;
}

/** Gera 8 dígitos sem zero à esquerda. O banco ainda valida a unicidade. */
export function generateProfileTestSlug(random: () => number = Math.random): string {
  return String(10000000 + Math.floor(random() * 90000000));
}

export const PROFILE_TEST_ACCESS_OPTIONS: ReadonlyArray<{
  value: ProfileTestAccessType;
  label: string;
  hint: string;
}> = [
  {
    value: 'public',
    label: 'Livre (sem conta)',
    hint: 'Qualquer pessoa responde pelo link. O resultado só aparece depois de criar a conta.',
  },
  {
    value: 'logged_in',
    label: 'Livre para usuários logados',
    hint: 'Qualquer pessoa com conta na plataforma pode responder.',
  },
  {
    value: 'course_owners',
    label: 'Apenas quem tem cursos específicos',
    hint: 'Só quem tem acesso a pelo menos um dos cursos selecionados.',
  },
  {
    value: 'plan_owners',
    label: 'Apenas quem tem planos específicos',
    hint: 'Só quem tem assinatura ativa em pelo menos um dos planos selecionados.',
  },
];

/**
 * Zera a lista de restrição que não pertence ao modo escolhido.
 *
 * Uma lista guardada fora do seu modo é uma armadilha: fica invisível na tela
 * (o seletor some) e volta a valer sozinha se alguém trocar o acesso de volta
 * meses depois. O modo é a única fonte da regra; o resto é resíduo.
 */
export function normalizeProfileTestAccess(input: {
  accessType?: ProfileTestAccessType;
  requiredCourseIds?: readonly string[];
  requiredPlanIds?: readonly string[];
}): {
  accessType: ProfileTestAccessType;
  requiredCourseIds: string[];
  requiredPlanIds: string[];
} {
  const accessType = input.accessType ?? 'logged_in';

  return {
    accessType,
    requiredCourseIds: accessType === 'course_owners' ? [...(input.requiredCourseIds ?? [])] : [],
    requiredPlanIds: accessType === 'plan_owners' ? [...(input.requiredPlanIds ?? [])] : [],
  };
}

export type ProfileTestDenialReason =
  | 'unpublished'
  | 'requires_login'
  | 'missing_course'
  | 'missing_plan';

/**
 * União discriminada: quando `allowed` é falso o motivo sempre existe, então a
 * rota escolhe a mensagem sem precisar de asserção.
 *
 * `anonymous` marca quem está respondendo sem conta — as respostas ficam no
 * navegador e o resultado só é liberado depois do cadastro.
 */
export type ProfileTestAccessDecision =
  | { allowed: true; reason: null; anonymous: boolean }
  | { allowed: false; reason: ProfileTestDenialReason; anonymous: false };

export type ProfileTestAccessInput = {
  test: {
    status: ProfileTestStatus;
    accessType?: ProfileTestAccessType;
    requiredCourseIds?: readonly string[];
    requiredPlanIds?: readonly string[];
  };
  isLoggedIn: boolean;
  isAdmin?: boolean;
  /** Cursos que o usuário realmente pode assistir hoje. */
  courseIds?: ReadonlySet<string>;
  /** Planos com assinatura ativa. */
  planIds?: ReadonlySet<string>;
};

const denied = (reason: ProfileTestDenialReason): ProfileTestAccessDecision => ({
  allowed: false,
  reason,
  anonymous: false,
});

const granted = (anonymous = false): ProfileTestAccessDecision => ({
  allowed: true,
  reason: null,
  anonymous,
});

/**
 * Decide se a pessoa pode abrir o teste.
 *
 * Regra por regra, sem tocar no banco — a rota busca o contexto e passa aqui,
 * o que mantém a política testável e igual no servidor e no preview do admin.
 */
export function evaluateProfileTestAccess(input: ProfileTestAccessInput): ProfileTestAccessDecision {
  const { test, isLoggedIn, isAdmin = false } = input;

  // Admin enxerga rascunho para revisar antes de publicar.
  if (isAdmin) return granted();

  if (test.status !== 'published') return denied('unpublished');

  const accessType = test.accessType ?? 'logged_in';

  if (accessType === 'public') return granted(!isLoggedIn);

  if (!isLoggedIn) return denied('requires_login');

  if (accessType === 'course_owners') {
    const required = test.requiredCourseIds ?? [];
    // Sem curso selecionado a restrição não foi configurada: vale como "logado".
    if (required.length === 0) return granted();
    const owned = input.courseIds ?? new Set<string>();
    return required.some((id) => owned.has(id)) ? granted() : denied('missing_course');
  }

  if (accessType === 'plan_owners') {
    const required = test.requiredPlanIds ?? [];
    if (required.length === 0) return granted();
    const owned = input.planIds ?? new Set<string>();
    return required.some((id) => owned.has(id)) ? granted() : denied('missing_plan');
  }

  return granted();
}

export function getProfileTestDenialCopy(reason: ProfileTestDenialReason): {
  title: string;
  message: string;
} {
  switch (reason) {
    case 'unpublished':
      return {
        title: 'Teste indisponível',
        message: 'Este teste não foi encontrado ou não está mais disponível.',
      };
    case 'requires_login':
      return {
        title: 'Entre para continuar',
        message: 'Este teste está disponível para quem tem conta na plataforma.',
      };
    case 'missing_course':
      return {
        title: 'Acesso restrito',
        message: 'Este teste é exclusivo para alunos dos cursos indicados pela equipe.',
      };
    case 'missing_plan':
      return {
        title: 'Acesso restrito',
        message: 'Seu plano atual não inclui este teste de perfil.',
      };
  }
}
