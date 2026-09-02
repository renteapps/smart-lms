'use client';

import { useEffect, useState } from 'react';
import { Braces, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveOnboardingVariableCatalog } from '@/app/actions/userVariables';
import type { OnboardingVariableDefinition } from '@/lib/userVariables';

type UserVariablePickerProps = {
  onSelect?: (tag: string) => void;
  compact?: boolean;
};

const NATIVE = [
  { key: 'first_name', questionText: 'Primeiro nome do aluno' },
  { key: 'email', questionText: 'E-mail do aluno' },
];

export function UserVariablePicker({ onSelect, compact = false }: UserVariablePickerProps) {
  const [definitions, setDefinitions] = useState<OnboardingVariableDefinition[]>([]);

  useEffect(() => {
    getActiveOnboardingVariableCatalog().then((result) => {
      if (result.success) setDefinitions(result.definitions);
    });
  }, []);

  const items = [
    ...NATIVE.map((item) => ({ ...item, active: true })),
    ...definitions,
  ];

  if (!items.length) return null;

  const choose = async (key: string) => {
    const tag = `{{${key}}}`;
    if (onSelect) {
      onSelect(tag);
      return;
    }
    try {
      await navigator.clipboard.writeText(tag);
      toast.success(`${tag} copiada.`);
    } catch {
      toast.error('Não foi possível copiar a variável.');
    }
  };

  return (
    <div className={compact ? 'space-y-2' : 'rounded-xl border border-border/50 bg-background-secondary/40 p-3'}>
      <p className="flex items-center gap-2 text-xs font-bold text-muted">
        <Braces size={14} className="text-accent" /> Variáveis do usuário
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            title={item.questionText}
            onClick={() => choose(item.key)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface px-2.5 py-1 font-mono text-[11px] font-bold text-foreground hover:border-accent hover:text-accent"
          >
            {`{{${item.key}}}`} {!onSelect && <Copy size={11} />}
          </button>
        ))}
      </div>
      {!compact && <p className="mt-2 text-[11px] text-muted">Use <code>{'{{variavel|texto alternativo}}'}</code> para definir um fallback.</p>}
    </div>
  );
}

