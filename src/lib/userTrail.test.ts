import { describe, expect, it } from 'vitest';
import { getFocusDay, type UserTrailContent } from './userTrail';

function content(lessonId: string, scheduledDate: string, duration = '10 min'): UserTrailContent {
  return { courseId: 'c1', lessonId, title: `Aula ${lessonId}`, cover: 'cover.jpg', duration, scheduledDate };
}

describe('getFocusDay', () => {
  const now = new Date('2026-08-12T14:30:00');

  it('escolhe hoje quando há conteúdo agendado para hoje', () => {
    const focus = getFocusDay(
      [content('a', '2026-08-12T09:00:00'), content('b', '2026-08-13T09:00:00')],
      now,
    );

    expect(focus?.offsetInDays).toBe(0);
    expect(focus?.items.map((item) => item.lessonId)).toEqual(['a']);
  });

  it('agrupa todos os conteúdos do dia em foco, independente da hora', () => {
    const focus = getFocusDay(
      [
        content('manha', '2026-08-12T07:00:00'),
        content('noite', '2026-08-12T22:45:00'),
        content('amanha', '2026-08-13T08:00:00'),
      ],
      now,
    );

    expect(focus?.items.map((item) => item.lessonId)).toEqual(['manha', 'noite']);
  });

  it('avança para o próximo dia com conteúdo quando hoje está vazio', () => {
    const focus = getFocusDay([content('a', '2026-08-15T09:00:00')], now);

    expect(focus?.offsetInDays).toBe(3);
    expect(focus?.items.map((item) => item.lessonId)).toEqual(['a']);
  });

  it('ignora dias passados em vez de exibi-los como pendência', () => {
    const focus = getFocusDay(
      [content('ontem', '2026-08-11T09:00:00'), content('depois', '2026-08-14T09:00:00')],
      now,
    );

    expect(focus?.offsetInDays).toBe(2);
    expect(focus?.items.map((item) => item.lessonId)).toEqual(['depois']);
  });

  it('considera conteúdo de hoje mais cedo que agora — o dia ainda não acabou', () => {
    const focus = getFocusDay([content('cedo', '2026-08-12T06:00:00')], now);

    expect(focus?.offsetInDays).toBe(0);
    expect(focus?.items.map((item) => item.lessonId)).toEqual(['cedo']);
  });

  it('soma a duração dos conteúdos do dia', () => {
    const focus = getFocusDay(
      [content('a', '2026-08-12T09:00:00', '15 min'), content('b', '2026-08-12T18:00:00', '25 min')],
      now,
    );

    expect(focus?.totalMinutes).toBe(40);
  });

  it('retorna null quando não há nada de hoje em diante', () => {
    expect(getFocusDay([content('ontem', '2026-08-10T09:00:00')], now)).toBeNull();
    expect(getFocusDay([], now)).toBeNull();
  });

  it('descarta itens sem data ou com data inválida', () => {
    const semData: UserTrailContent = { courseId: 'c1', lessonId: 'x', title: 'X', cover: 'c.jpg' };
    const dataInvalida = content('y', 'não é uma data');

    expect(getFocusDay([semData, dataInvalida], now)).toBeNull();
  });
});
