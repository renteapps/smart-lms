'use client';

import { useState } from 'react';
import { Bot, Save, FileJson } from 'lucide-react';
import { Questionnaire } from '@/types/trilha';
import { mockQuestionnaire } from '@/lib/seed/questionnaire';
import { PageHeader, StatusBadge } from '@/components/ui/editorial';

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
    <div className="flex min-h-[calc(100dvh-140px)] flex-col gap-7">
      <PageHeader eyebrow="Automação de trilhas" title="Questionário da Trilha" description="Gere e revise as perguntas do onboarding usando o pool de aulas elegíveis." actions={
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="flex min-h-11 items-center gap-2 rounded-[11px] border border-primary/25 bg-primary-pale px-4 text-sm font-bold text-primary-active hover:bg-primary/15 disabled:opacity-50"
          >
            <Bot size={20} />
            {loading ? 'Gerando...' : 'Gerar com IA'}
          </button>
          
          <button 
            onClick={handlePublish}
            disabled={!questionnaire || questionnaire.status === 'published'}
            className="flex min-h-11 items-center gap-2 rounded-[11px] bg-primary px-4 text-sm font-bold text-on-primary hover:bg-primary-active disabled:opacity-50"
          >
            <Save size={20} />
            Publicar
          </button>
        </div>
      } />

      <div className="editorial-card flex min-h-[560px] flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-canvas-soft px-4 py-3">
          <div className="flex items-center gap-2 text-text-soft">
            <FileJson size={18} />
            <span className="font-mono text-sm">questionnaire.json</span>
          </div>
          {questionnaire && (
            <div className="flex items-center gap-2">
              <StatusBadge tone={questionnaire.status === 'published' ? 'positive' : 'warning'}>{questionnaire.status} · v{questionnaire.version}</StatusBadge>
            </div>
          )}
        </div>
        <textarea
          className="flex-1 resize-none bg-surface p-5 font-mono text-sm leading-6 text-ink outline-none focus:bg-primary-pale/15"
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            try {
              setQuestionnaire(JSON.parse(e.target.value));
            } catch {
              // invalid json
            }
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
