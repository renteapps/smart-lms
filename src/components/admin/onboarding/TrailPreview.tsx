'use client';

import React, { useMemo, useState } from 'react';
import { Questionnaire, StudyAvailability, Weekday } from '@/types/trilha';
import { generateLearningTrail } from '@/lib/matching';
import type { ContentIndex } from '@/lib/contentCatalog';
import { CalendarDays, Clock3, Sparkles, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrailPreviewProps {
  questionnaire: Questionnaire;
  /** Catálogo real — a prévia simula exatamente o que o aluno receberia. */
  index: ContentIndex;
}

const DAYS: Array<{ value: Weekday; label: string }> = [
  { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' },
];

const roleLabels = { essential: 'Essencial', deepening: 'Aprofundamento', extra: 'Extra' };

export const TrailPreview: React.FC<TrailPreviewProps> = ({ questionnaire, index }) => {
  const contentQuestions = questionnaire.questions.filter((question) => question.type !== 'availability');
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => Object.fromEntries(
    contentQuestions.map((question) => [question.id, question.options[0] ? [question.options[0].label] : []]),
  ));
  const [availability, setAvailability] = useState<StudyAvailability>({ weekdays: [1, 3, 5], minutesPerSession: 30 });

  const trail = useMemo(
    () => generateLearningTrail('preview', answers, questionnaire, availability, undefined, new Date(), index),
    [answers, availability, questionnaire, index],
  );
  const sessions = useMemo(() => trail.items.reduce<Record<string, typeof trail.items>>((groups, item) => {
    groups[item.sessionId] = [...(groups[item.sessionId] || []), item];
    return groups;
  }, {}), [trail]);

  const toggleAnswer = (questionId: string, label: string, single: boolean) => {
    setAnswers((current) => {
      const selected = current[questionId] || [];
      return { ...current, [questionId]: single ? [label] : selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label] };
    });
  };

  const toggleDay = (day: Weekday) => setAvailability((current) => ({
    ...current,
    weekdays: current.weekdays.includes(day) ? current.weekdays.filter((item) => item !== day) : [...current.weekdays, day],
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <aside className="space-y-5">
        <div className="rounded-[14px] border border-primary/25 bg-primary/5 p-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="mt-3 text-xl font-bold text-ink">Simule um perfil real</h3>
          <p className="mt-2 text-sm leading-6 text-text-soft">A prévia usa as mesmas regras do aluno e explica por que cada conteúdo entrou.</p>
        </div>
        {contentQuestions.map((question) => (
          <fieldset key={question.id} className="rounded-[12px] border border-border bg-surface p-4">
            <legend className="px-1 text-sm font-bold text-ink">{question.text}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {question.options.map((option) => {
                const selected = answers[question.id]?.includes(option.label);
                return <button key={option.label} type="button" aria-pressed={selected} onClick={() => toggleAnswer(question.id, option.label, question.type === 'single')} className={cn('rounded-[9px] border px-3 py-2 text-xs font-semibold', selected ? 'border-primary bg-primary-pale text-primary-active' : 'border-border text-text-soft')}>{option.label}</button>;
              })}
            </div>
          </fieldset>
        ))}
        <div className="rounded-[12px] border border-border bg-surface p-4">
          <p className="text-sm font-bold text-ink">Rotina simulada</p>
          <div className="mt-3 flex flex-wrap gap-2">{DAYS.map((day) => <button key={day.value} type="button" aria-pressed={availability.weekdays.includes(day.value)} onClick={() => toggleDay(day.value)} className={cn('grid h-10 min-w-10 place-items-center rounded-[9px] border text-xs font-bold', availability.weekdays.includes(day.value) ? 'border-primary bg-primary text-white' : 'border-border text-text-soft')}>{day.label}</button>)}</div>
          <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-text-soft"><Clock3 size={16} /><input type="number" min="10" max="240" value={availability.minutesPerSession} onChange={(event) => setAvailability((current) => ({ ...current, minutesPerSession: Math.max(10, Math.min(240, Number(event.target.value) || 10)) }))} className="w-20 rounded-[8px] border border-border bg-bg px-2 py-1.5 text-text outline-none focus:border-primary" /> minutos por sessão</label>
        </div>
      </aside>

      <section className="rounded-[14px] border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4"><div><p className="eyebrow">Agenda calculada</p><h3 className="mt-1 text-2xl font-extrabold text-ink">{Object.keys(sessions).length} sessões · {trail.items.length} conteúdos</h3></div><CalendarDays className="h-7 w-7 text-primary" /></div>
        {trail.items.length === 0 ? <p className="py-16 text-center text-sm text-text-mute">Selecione respostas com conteúdos associados para gerar a simulação.</p> : (
          <div className="mt-6 space-y-7">{Object.entries(sessions).map(([sessionId, items]) => (
            <div key={sessionId}>
              <div className="mb-3 flex items-center gap-3"><strong className="text-sm capitalize text-ink">{new Date(`${items[0].scheduledDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</strong><span className="h-px flex-1 bg-border" /><span className="text-xs font-semibold text-text-mute">{items.reduce((sum, item) => sum + item.durationMin, 0)} min</span></div>
              <div className="space-y-2">{items.map((item) => <article key={item.id} className="rounded-[10px] border border-border bg-bg p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-primary-active">{roleLabels[item.learningRole]}</span><h4 className="mt-1 font-bold text-ink">{item.title}</h4><p className="mt-1 text-xs text-text-soft">{item.reason}</p></div><span className="shrink-0 text-xs font-bold text-text-mute">{item.durationMin} min</span></div>{item.overBudget && <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-warning"><TriangleAlert size={14} /> Acima da meta; ficará sozinho nesta sessão.</p>}</article>)}</div>
            </div>
          ))}</div>
        )}
      </section>
    </div>
  );
};
