'use client';

import React from 'react';
import { Check } from 'lucide-react';

export type WizardStep = {
  id: number;
  title: string;
  subtitle: string;
};

interface StepWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
  /**
   * Variante para caber dentro de um modal: sem o card grudento de página
   * inteira, e com os passos lado a lado já no mobile.
   */
  compact?: boolean;
}

export const StepWizard: React.FC<StepWizardProps> = ({ steps, currentStep, onStepClick, compact = false }) => {
  return (
    <div
      className={
        compact
          ? 'w-full'
          : 'w-full bg-surface/90 backdrop-blur-md border border-border/50 rounded-2xl p-4 sm:p-6 shadow-md mb-8 sticky top-4 z-30 transition-all'
      }
    >
      <div className={compact ? 'grid grid-cols-4 gap-1.5 relative' : 'grid grid-cols-1 sm:grid-cols-4 gap-4 relative'}>
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`flex items-center rounded-xl transition-all text-left ${
                compact ? 'gap-2 p-2 justify-center min-[520px]:justify-start' : 'gap-3 p-3'
              } ${
                isCurrent
                  ? 'bg-accent/10 border border-accent/30 ring-1 ring-primary/20'
                  : isCompleted
                  ? 'hover:bg-surface-hover opacity-90'
                  : 'opacity-50 hover:opacity-75'
              }`}
            >
              <div
                className={`rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                  compact ? 'w-7 h-7 text-xs' : 'w-9 h-9'
                } ${
                  isCompleted
                    ? 'bg-success text-white'
                    : isCurrent
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-background-secondary text-muted'
                }`}
              >
                {isCompleted ? <Check className={compact ? 'w-4 h-4' : 'w-5 h-5'} /> : step.id}
              </div>

              <div className={compact ? 'hidden min-[520px]:block overflow-hidden' : 'overflow-hidden'}>
                <span
                  className={`block font-bold truncate ${compact ? 'text-xs' : 'text-sm'} ${
                    isCurrent ? 'text-accent' : 'text-foreground'
                  }`}
                >
                  {step.title}
                </span>
                {!compact && <span className="block text-xs text-muted truncate">{step.subtitle}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
