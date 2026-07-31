'use client';

import { useState } from 'react';
import { mockEligibleLessons } from '@/lib/mocks/trilhaMocks';
import { EligibleLesson } from '@/types/trilha';
import { Bot, Save, CheckCircle2, ChevronRight, Folder } from 'lucide-react';
import { PageHeader } from '@/components/ui/editorial';

export default function CuradoriaPage() {
  const [selectedLesson, setSelectedLesson] = useState<EligibleLesson | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleSuggestTags = () => {
    setLoadingAi(true);
    // Simular chamada de IA
    setTimeout(() => {
      if (selectedLesson) {
        setSelectedLesson({
          ...selectedLesson,
          topics: [...new Set([...selectedLesson.topics, 'ia-sugeriu-topic'])],
          problemasQueResolve: [...new Set([...selectedLesson.problemasQueResolve, 'novo-problema'])],
        });
      }
      setLoadingAi(false);
    }, 1500);
  };

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Inteligência de conteúdo" title="Curadoria da Trilha" description="Selecione aulas e refine os metadados usados pelo algoritmo de matching." actions={
        <button className="flex min-h-11 items-center gap-2 rounded-[11px] bg-primary px-4 text-sm font-bold text-on-primary hover:bg-primary-active">
          <Save size={20} />
          Salvar Pool
        </button>
      } />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Painel Esquerdo: Seleção de Aulas */}
        <div className="editorial-card col-span-1 p-4 lg:col-span-2 sm:p-5">
          <h2 className="mb-4 text-lg font-extrabold text-ink">Pool de aulas elegíveis</h2>
          <div className="flex flex-col gap-2">
            {mockEligibleLessons.map((lesson) => (
              <div
                key={lesson.lessonId}
                onClick={() => setSelectedLesson(lesson)}
                className={`flex cursor-pointer items-center justify-between rounded-[12px] border p-3 ${
                  selectedLesson?.lessonId === lesson.lessonId
                    ? 'border-primary/35 bg-primary-pale'
                    : 'border-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-canvas-soft text-text-soft">
                    <Folder size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink">{lesson.title}</h3>
                    <p className="text-sm text-text-mute">
                      {lesson.courseSlug} / {lesson.moduleId}
                    </p>
                  </div>
                </div>
                {lesson.topics.length > 0 && <CheckCircle2 size={18} className="text-primary" />}
              </div>
            ))}
          </div>
        </div>

        {/* Painel Direito: Edição de Metadados */}
        <div className="editorial-card col-span-1 p-5">
          <h2 className="mb-4 text-lg font-extrabold text-ink">Metadados da aula</h2>
          {selectedLesson ? (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-bold text-ink">{selectedLesson.title}</h3>
                <p className="mt-1 text-sm leading-6 text-text-soft">{selectedLesson.description}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-ink">Tópicos (tags)</label>
                <div className="flex flex-wrap gap-2">
                  {selectedLesson.topics.map((topic, idx) => (
                    <span key={idx} className="rounded-full bg-primary-pale px-3 py-1 text-sm font-semibold text-primary-active">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-ink">Problemas que resolve</label>
                <div className="flex flex-wrap gap-2">
                  {selectedLesson.problemasQueResolve.map((prob, idx) => (
                    <span key={idx} className="rounded-full bg-negative/10 px-3 py-1 text-sm font-semibold text-negative">
                      {prob}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-ink">Nível</label>
                <select 
                  className="min-h-11 rounded-[11px] border border-border bg-canvas-soft px-3 text-ink focus:border-primary focus:outline-none"
                  value={selectedLesson.nivel}
                  onChange={(e) => setSelectedLesson({...selectedLesson, nivel: e.target.value as EligibleLesson['nivel']})}
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              </div>

              <button
                onClick={handleSuggestTags}
                disabled={loadingAi}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-primary/25 bg-primary-pale px-4 text-sm font-bold text-primary-active hover:bg-primary/15 disabled:opacity-50"
              >
                <Bot size={20} />
                {loadingAi ? 'Analisando...' : 'Sugerir Tags com IA'}
              </button>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-[14px] bg-canvas-soft text-text-mute">
              <ChevronRight size={32} className="mb-2 opacity-50" />
              <p className="text-center text-sm">Selecione uma aula à esquerda para editar seus metadados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
