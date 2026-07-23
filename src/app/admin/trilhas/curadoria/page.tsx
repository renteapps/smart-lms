'use client';

import { useState } from 'react';
import { mockEligibleLessons } from '@/lib/mocks/trilhaMocks';
import { EligibleLesson } from '@/types/trilha';
import { Bot, Save, CheckCircle2, ChevronRight, Folder } from 'lucide-react';

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
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Curadoria da Trilha</h1>
          <p className="text-gray-400">Selecione as aulas e defina os metadados para o algoritmo de matching.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-on-primary transition-colors hover:bg-primary-active">
          <Save size={20} />
          Salvar Pool
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Painel Esquerdo: Seleção de Aulas */}
        <div className="col-span-1 rounded-xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold text-white">Pool de Aulas Elegíveis</h2>
          <div className="flex flex-col gap-2">
            {mockEligibleLessons.map((lesson) => (
              <div
                key={lesson.lessonId}
                onClick={() => setSelectedLesson(lesson)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                  selectedLesson?.lessonId === lesson.lessonId
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-gray-300">
                    <Folder size={16} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{lesson.title}</h3>
                    <p className="text-sm text-gray-400">
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
        <div className="col-span-1 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Metadados da Aula</h2>
          {selectedLesson ? (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-medium text-white">{selectedLesson.title}</h3>
                <p className="text-sm text-gray-400">{selectedLesson.description}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Tópicos (Tags)</label>
                <div className="flex flex-wrap gap-2">
                  {selectedLesson.topics.map((topic, idx) => (
                    <span key={idx} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Problemas que Resolve</label>
                <div className="flex flex-wrap gap-2">
                  {selectedLesson.problemasQueResolve.map((prob, idx) => (
                    <span key={idx} className="rounded-full bg-red-500/20 px-3 py-1 text-sm text-red-200">
                      {prob}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Nível</label>
                <select 
                  className="rounded-lg border border-white/10 bg-black/50 p-2 text-white"
                  value={selectedLesson.nivel}
                  onChange={(e) => setSelectedLesson({...selectedLesson, nivel: e.target.value as any})}
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              </div>

              <button
                onClick={handleSuggestTags}
                disabled={loadingAi}
                className="mt-4 flex w-full justify-center items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                <Bot size={20} />
                {loadingAi ? 'Analisando...' : 'Sugerir Tags com IA'}
              </button>
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center text-gray-500">
              <ChevronRight size={32} className="mb-2 opacity-50" />
              <p className="text-center text-sm">Selecione uma aula à esquerda para editar seus metadados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
