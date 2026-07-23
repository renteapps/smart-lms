'use client';

import { useState } from 'react';
import { Bot, Save, FileJson, CheckCircle } from 'lucide-react';
import { Questionnaire } from '@/types/trilha';
import { mockQuestionnaire } from '@/lib/mocks/trilhaMocks';

export default function QuestionarioPage() {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(mockQuestionnaire);
  const [loading, setLoading] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(mockQuestionnaire, null, 2));

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/trilhas/generate-questions', { method: 'POST' });
      const data = await res.json();
      setQuestionnaire(data);
      setJsonText(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    if (!questionnaire) return;
    const published = { ...questionnaire, status: 'published' as const };
    setQuestionnaire(published);
    setJsonText(JSON.stringify(published, null, 2));
    alert('Questionário publicado com sucesso!');
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Questionário da Trilha (IA)</h1>
          <p className="text-gray-400">Gere e revise as perguntas do onboarding usando o pool de aulas.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            <Bot size={20} />
            {loading ? 'Gerando...' : 'Gerar com IA'}
          </button>
          
          <button 
            onClick={handlePublish}
            disabled={!questionnaire || questionnaire.status === 'published'}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-on-primary transition-colors hover:bg-primary-active disabled:opacity-50 disabled:grayscale"
          >
            <Save size={20} />
            Publicar
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1e1e1e]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-300">
            <FileJson size={18} />
            <span className="font-mono text-sm">questionnaire.json</span>
          </div>
          {questionnaire && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${questionnaire.status === 'published' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-500'}`}>
                {questionnaire.status} (v{questionnaire.version})
              </span>
            </div>
          )}
        </div>
        <textarea
          className="flex-1 resize-none bg-transparent p-4 font-mono text-sm text-green-400 outline-none"
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            try {
              setQuestionnaire(JSON.parse(e.target.value));
            } catch (e) {
              // invalid json
            }
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
