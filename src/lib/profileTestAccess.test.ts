import { describe, expect, it } from 'vitest';
import {
  evaluateProfileTestAccess,
  generateProfileTestSlug,
  isProfileTestSlug,
  normalizeProfileTestAccess,
  normalizeProfileTestSlug,
  type ProfileTestAccessInput,
} from './profileTestAccess';

describe('slug numérico do diagnóstico', () => {
  it('aceita apenas dígitos dentro do tamanho suportado', () => {
    expect(isProfileTestSlug('48273916')).toBe(true);
    expect(isProfileTestSlug('482739')).toBe(true);
    expect(isProfileTestSlug('12345')).toBe(false);
    expect(isProfileTestSlug('meu-teste')).toBe(false);
    expect(isProfileTestSlug('4827-3916')).toBe(false);
    expect(isProfileTestSlug(null)).toBe(false);
  });

  it('normaliza o que o admin digita e devolve null quando não dá para aproveitar', () => {
    expect(normalizeProfileTestSlug(' 4827 3916 ')).toBe('48273916');
    expect(normalizeProfileTestSlug('482-739-16')).toBe('48273916');
    expect(normalizeProfileTestSlug('')).toBeNull();
    expect(normalizeProfileTestSlug('meu-teste')).toBeNull();
    expect(normalizeProfileTestSlug('123')).toBeNull();
  });

  it('gera 8 dígitos sem zero à esquerda nas pontas do sorteio', () => {
    expect(generateProfileTestSlug(() => 0)).toBe('10000000');
    expect(generateProfileTestSlug(() => 0.9999999999)).toBe('99999999');
    expect(isProfileTestSlug(generateProfileTestSlug())).toBe(true);
  });
});

describe('regras de acesso do teste de perfil', () => {
  const base = (
    overrides: Partial<ProfileTestAccessInput['test']> = {},
    rest: Partial<Omit<ProfileTestAccessInput, 'test'>> = {},
  ): ProfileTestAccessInput => ({
    test: { status: 'published', accessType: 'logged_in', ...overrides },
    isLoggedIn: false,
    ...rest,
  });

  it('esconde rascunho de quem não é admin', () => {
    expect(evaluateProfileTestAccess(base({ status: 'draft' }, { isLoggedIn: true }))).toEqual({
      allowed: false,
      reason: 'unpublished',
      anonymous: false,
    });
  });

  it('libera rascunho para admin revisar', () => {
    const decision = evaluateProfileTestAccess(
      base({ status: 'draft', accessType: 'plan_owners', requiredPlanIds: ['plan-1'] }, { isLoggedIn: true, isAdmin: true }),
    );
    expect(decision.allowed).toBe(true);
  });

  it('marca como anônimo o teste livre aberto sem conta', () => {
    expect(evaluateProfileTestAccess(base({ accessType: 'public' }))).toEqual({
      allowed: true,
      reason: null,
      anonymous: true,
    });
  });

  it('não trata como anônimo o teste livre aberto por quem já está logado', () => {
    const decision = evaluateProfileTestAccess(base({ accessType: 'public' }, { isLoggedIn: true }));
    expect(decision).toEqual({ allowed: true, reason: null, anonymous: false });
  });

  it('exige login em tudo que não é público', () => {
    for (const accessType of ['logged_in', 'course_owners', 'plan_owners'] as const) {
      expect(evaluateProfileTestAccess(base({ accessType })).reason).toBe('requires_login');
    }
  });

  it('libera por curso quando o aluno tem pelo menos um dos exigidos', () => {
    const input = base(
      { accessType: 'course_owners', requiredCourseIds: ['curso-x', 'curso-y'] },
      { isLoggedIn: true, courseIds: new Set(['curso-y']) },
    );
    expect(evaluateProfileTestAccess(input).allowed).toBe(true);
  });

  it('nega por curso quando o aluno não tem nenhum dos exigidos', () => {
    const input = base(
      { accessType: 'course_owners', requiredCourseIds: ['curso-x'] },
      { isLoggedIn: true, courseIds: new Set(['curso-z']) },
    );
    expect(evaluateProfileTestAccess(input).reason).toBe('missing_course');
  });

  it('trata lista de cursos vazia como restrição não configurada', () => {
    const input = base({ accessType: 'course_owners', requiredCourseIds: [] }, { isLoggedIn: true });
    expect(evaluateProfileTestAccess(input).allowed).toBe(true);
  });

  it('libera e nega por plano da mesma forma', () => {
    const allowed = base(
      { accessType: 'plan_owners', requiredPlanIds: ['plano-w'] },
      { isLoggedIn: true, planIds: new Set(['plano-w']) },
    );
    const blocked = base(
      { accessType: 'plan_owners', requiredPlanIds: ['plano-w'] },
      { isLoggedIn: true, planIds: new Set(['plano-basico']) },
    );

    expect(evaluateProfileTestAccess(allowed).allowed).toBe(true);
    expect(evaluateProfileTestAccess(blocked).reason).toBe('missing_plan');
  });

  it('assume acesso de logado quando o teste antigo não tem accessType', () => {
    const decision = evaluateProfileTestAccess({
      test: { status: 'published' },
      isLoggedIn: true,
    });
    expect(decision.allowed).toBe(true);
  });
});

describe('normalização do escopo de acesso', () => {
  it('mantém a lista do modo escolhido', () => {
    expect(
      normalizeProfileTestAccess({ accessType: 'course_owners', requiredCourseIds: ['curso-x'] }),
    ).toEqual({ accessType: 'course_owners', requiredCourseIds: ['curso-x'], requiredPlanIds: [] });

    expect(
      normalizeProfileTestAccess({ accessType: 'plan_owners', requiredPlanIds: ['plano-w'] }),
    ).toEqual({ accessType: 'plan_owners', requiredCourseIds: [], requiredPlanIds: ['plano-w'] });
  });

  it('descarta a lista que sobrou de um modo anterior', () => {
    expect(
      normalizeProfileTestAccess({
        accessType: 'public',
        requiredCourseIds: ['curso-x'],
        requiredPlanIds: ['plano-w'],
      }),
    ).toEqual({ accessType: 'public', requiredCourseIds: [], requiredPlanIds: [] });

    expect(
      normalizeProfileTestAccess({ accessType: 'course_owners', requiredPlanIds: ['plano-w'] }).requiredPlanIds,
    ).toEqual([]);
  });

  it('assume "apenas logados" quando o modo não veio', () => {
    expect(normalizeProfileTestAccess({ requiredCourseIds: ['curso-x'] })).toEqual({
      accessType: 'logged_in',
      requiredCourseIds: [],
      requiredPlanIds: [],
    });
  });
});
