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
}

export const StepWizard: React.FC<StepWizardProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="w-full bg-surface-card/90 backdrop-blur-md border border-border/50 rounded-2xl p-4 sm:p-6 shadow-md mb-8 sticky top-4 z-30 transition-all">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                isCurrent
                  ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                  : isCompleted
                  ? 'hover:bg-surface-hover opacity-90'
                  : 'opacity-50 hover:opacity-75'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                  isCompleted
                    ? 'bg-positive text-white'
                    : isCurrent
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-canvas-soft text-text-mute'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.id}
              </div>

              <div className="overflow-hidden">
                <span className={`block font-bold text-sm truncate ${isCurrent ? 'text-primary' : 'text-text'}`}>
                  {step.title}
                </span>
                <span className="block text-xs text-text-soft truncate">{step.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
