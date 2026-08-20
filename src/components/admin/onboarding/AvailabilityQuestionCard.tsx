import React, { useState } from 'react';
import { Question } from '@/types/trilha';
import { CalendarClock, Plus, X, Lock } from 'lucide-react';

interface AvailabilityQuestionCardProps {
  question: Question;
  onUpdate: (updated: Question) => void;
}

const DEFAULT_CONFIG = { minutePresets: [15, 30, 45, 60, 90], minMinutes: 10, maxMinutes: 240 };

/** Clamp usado pelo motor de agendamento (`schedulePendingItems`) — a config nunca pode fugir disso. */
function clampMinutes(value: number): number {
  return Math.max(10, Math.min(240, value || 10));
}

/**
 * Pergunta de disponibilidade — sempre única e sempre a última do questionário.
 *
 * Por isso não fica na lista arrastável/excluível de perguntas comuns: fica fixada
 * no fim da tela, num slot dedicado. Isso torna a regra de negócio impossível de
 * violar pela UI, em vez de só detectada tarde, no clique de publicar.
 */
export const AvailabilityQuestionCard: React.FC<AvailabilityQuestionCardProps> = ({ question, onUpdate }) => {
  const [newPreset, setNewPreset] = useState('');
  const config = question.availabilityConfig || DEFAULT_CONFIG;

  const updateConfig = (patch: Partial<typeof DEFAULT_CONFIG>) => {
    onUpdate({ ...question, availabilityConfig: { ...config, ...patch } });
  };

  const handleAddPreset = () => {
    const value = clampMinutes(Number(newPreset));
    if (!value || config.minutePresets.includes(value)) { setNewPreset(''); return; }
    updateConfig({ minutePresets: [...config.minutePresets, value].sort((a, b) => a - b) });
    setNewPreset('');
  };

  const handleRemovePreset = (value: number) => {
    updateConfig({ minutePresets: config.minutePresets.filter((preset) => preset !== value) });
  };

  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><CalendarClock size={20} /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-foreground">Rotina de estudo</h4>
            <span className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
              <Lock size={11} /> sempre a última pergunta
            </span>
          </div>
          <input
            type="text"
            value={question.text}
            onChange={(event) => onUpdate({ ...question, text: event.target.value })}
            className="mt-2 w-full max-w-md bg-transparent text-sm font-medium text-foreground outline-none border-b border-transparent focus:border-accent py-0.5 transition-colors"
          />
          <p className="mt-2 text-xs leading-5 text-muted">
            O aluno escolhe dias específicos e uma meta de {config.minMinutes} a {config.maxMinutes} minutos por sessão. Esta pergunta não associa conteúdos.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">Sugestões de minutos por sessão</label>
              <div className="flex flex-wrap items-center gap-2">
                {config.minutePresets.map((preset) => (
                  <span key={preset} className="flex items-center gap-1 rounded-full bg-surface border border-border/60 px-2.5 py-1 text-xs font-semibold text-foreground">
                    {preset} min
                    <button onClick={() => handleRemovePreset(preset)} className="text-muted hover:text-danger transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1 rounded-full border border-dashed border-accent/40 pl-2 pr-1 py-0.5">
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={newPreset}
                    onChange={(event) => setNewPreset(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddPreset(); } }}
                    placeholder="min"
                    className="w-12 bg-transparent text-xs text-foreground outline-none placeholder:text-muted"
                  />
                  <button onClick={handleAddPreset} className="p-0.5 text-accent hover:text-accent-soft-foreground transition-colors" aria-label="Adicionar sugestão">
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">Mínimo (min)</label>
              <input
                type="number"
                min={10}
                max={240}
                value={config.minMinutes}
                onChange={(event) => updateConfig({ minMinutes: clampMinutes(Number(event.target.value)) })}
                className="w-20 rounded-lg border border-border/60 bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">Máximo (min)</label>
              <input
                type="number"
                min={10}
                max={240}
                value={config.maxMinutes}
                onChange={(event) => updateConfig({ maxMinutes: clampMinutes(Number(event.target.value)) })}
                className="w-20 rounded-lg border border-border/60 bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
