import { describe, expect, it } from 'vitest';
import {
  deriveStudentCourseState,
  getCourseSalesTemplate,
  getStudentCourseAction,
  hasCourseAccess,
  isEnrollmentActive,
  isSubscriptionActive,
  planAllowsCourse,
} from './courseAccess';

describe('validade do acesso', () => {
  const now = new Date('2026-08-20T12:00:00.000Z');

  it('aceita matrícula ativa vitalícia ou ainda válida', () => {
    expect(isEnrollmentActive({ status: 'active', expiresAt: null }, now)).toBe(true);
    expect(isEnrollmentActive({ status: 'active', expiresAt: '2026-08-21T12:00:00.000Z' }, now)).toBe(true);
  });

  it('nega matrícula expirada ou revogada', () => {
    expect(isEnrollmentActive({ status: 'active', expiresAt: '2026-08-19T12:00:00.000Z' }, now)).toBe(false);
    expect(isEnrollmentActive({ status: 'revoked', expiresAt: null }, now)).toBe(false);
  });

  it('nega assinatura encerrada ou fora do período', () => {
    expect(isSubscriptionActive({ status: 'canceled', currentPeriodEnd: null }, now)).toBe(false);
    expect(isSubscriptionActive({ status: 'active', currentPeriodEnd: '2026-08-19T12:00:00.000Z' }, now)).toBe(false);
    expect(isSubscriptionActive({ status: 'active', currentPeriodEnd: '2026-08-21T12:00:00.000Z' }, now)).toBe(true);
  });
});

describe('getCourseSalesTemplate', () => {
  it('prioriza sales_url e usa sales_config como fallback', () => {
    expect(getCourseSalesTemplate({
      salesUrl: ' https://checkout.test/principal ',
      salesConfig: { salesUrl: 'https://checkout.test/config' },
    })).toBe('https://checkout.test/principal');
    expect(getCourseSalesTemplate({
      salesConfig: { salesUrl: 'https://checkout.test/config' },
    })).toBe('https://checkout.test/config');
  });

  it('retorna nulo sem checkout configurado', () => {
    expect(getCourseSalesTemplate({ salesUrl: ' ', salesConfig: {} })).toBeNull();
  });
});

describe('getStudentCourseAction', () => {
  it('mapeia os quatro estados para os CTAs e destinos corretos', () => {
    expect(getStudentCourseAction({
      state: { kind: 'locked', salesUrl: 'https://checkout.test' },
      courseId: 'course-1',
      resolvedSalesUrl: 'https://checkout.test?email=ana%40test.com',
    })).toEqual({
      label: 'Realizar Matrícula',
      href: 'https://checkout.test?email=ana%40test.com',
    });
    expect(getStudentCourseAction({ state: { kind: 'available' }, courseId: 'course-1' }))
      .toEqual({ label: 'Conhecer curso', href: '/courses/course-1' });
    expect(getStudentCourseAction({ state: { kind: 'in-progress', progress: 40 }, courseId: 'course-1' }))
      .toEqual({ label: 'Continuar curso', href: '/courses/course-1' });
    expect(getStudentCourseAction({
      state: { kind: 'completed', certificateEnabled: true, certificateIssued: true },
      courseId: 'course-1',
    })).toEqual({ label: 'Certificado', href: '/certificados?curso=course-1' });
    expect(getStudentCourseAction({
      state: { kind: 'completed', certificateEnabled: false, certificateIssued: false },
      courseId: 'course-1',
    })).toEqual({ label: 'Revisar curso', href: '/courses/course-1' });
  });

  it('desabilita matrícula sem link de vendas', () => {
    expect(getStudentCourseAction({
      state: { kind: 'locked', salesUrl: null },
      courseId: 'course-1',
    })).toEqual({ label: 'Matrícula indisponível', href: null });
  });
});

describe('planAllowsCourse', () => {
  it('libera todos os cursos em planos globais e legados', () => {
    expect(planAllowsCourse({ courseAccessType: 'all' }, 'course-1')).toBe(true);
    expect(planAllowsCourse(['Certificados', 'Suporte'], 'course-1')).toBe(true);
  });

  it('respeita a lista de cursos específicos', () => {
    const features = { courseAccessType: 'specific' as const, specificCourses: ['course-1'] };
    expect(planAllowsCourse(features, 'course-1')).toBe(true);
    expect(planAllowsCourse(features, 'course-2')).toBe(false);
  });
});

describe('hasCourseAccess', () => {
  it('aceita matrícula válida ou um plano compatível', () => {
    expect(hasCourseAccess({
      courseId: 'course-1',
      enrolledCourseIds: new Set(['course-1']),
      activePlanFeatures: [],
    })).toBe(true);
    expect(hasCourseAccess({
      courseId: 'course-2',
      enrolledCourseIds: new Set(),
      activePlanFeatures: [{ courseAccessType: 'specific', specificCourses: ['course-2'] }],
    })).toBe(true);
  });

  it('nega quando matrícula e planos não incluem o curso', () => {
    expect(hasCourseAccess({
      courseId: 'course-2',
      enrolledCourseIds: new Set(['course-1']),
      activePlanFeatures: [{ courseAccessType: 'specific', specificCourses: ['course-3'] }],
    })).toBe(false);
  });
});

describe('deriveStudentCourseState', () => {
  it('mantém sem acesso bloqueado e preserva o checkout configurado', () => {
    expect(deriveStudentCourseState({
      hasAccess: false,
      hasStarted: false,
      progress: 0,
      certificateEnabled: true,
      salesUrl: 'https://checkout.test/course-1',
    })).toEqual({ kind: 'locked', salesUrl: 'https://checkout.test/course-1' });
  });

  it('distingue disponível de iniciado com zero por cento concluído', () => {
    expect(deriveStudentCourseState({
      hasAccess: true,
      hasStarted: false,
      progress: 0,
      certificateEnabled: false,
    })).toEqual({ kind: 'available' });

    expect(deriveStudentCourseState({
      hasAccess: true,
      hasStarted: true,
      progress: 0,
      certificateEnabled: false,
    })).toEqual({ kind: 'in-progress', progress: 0 });
  });

  it('marca conclusão com e sem certificado', () => {
    expect(deriveStudentCourseState({
      hasAccess: true,
      hasStarted: true,
      progress: 100,
      certificateEnabled: true,
      certificateIssued: true,
    })).toEqual({ kind: 'completed', certificateEnabled: true, certificateIssued: true });

    expect(deriveStudentCourseState({
      hasAccess: true,
      hasStarted: true,
      progress: 100,
      certificateEnabled: false,
    })).toEqual({ kind: 'completed', certificateEnabled: false, certificateIssued: false });
  });
});
