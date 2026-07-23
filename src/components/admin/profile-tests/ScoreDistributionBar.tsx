import React from 'react';
import { ProfileCategory } from '@/types/profileTest';

interface ScoreDistributionBarProps {
  categories: ProfileCategory[];
  categoryScores: Record<string, number>;
}

export const ScoreDistributionBar: React.FC<ScoreDistributionBarProps> = ({ categories, categoryScores }) => {
  const totalPoints = Object.values(categoryScores).reduce((acc, score) => acc + (score || 0), 0);

  if (totalPoints === 0) {
    return (
      <div className="w-full bg-canvas-soft rounded-full h-2 overflow-hidden flex">
        <div className="w-full bg-border/40 h-full" title="Sem pontuação definida" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="w-full bg-canvas-soft rounded-full h-2.5 overflow-hidden flex shadow-inner">
        {categories.map((cat) => {
          const score = categoryScores[cat.id] || 0;
          if (score <= 0) return null;
          const percentage = (score / totalPoints) * 100;
          return (
            <div
              key={cat.id}
              style={{
                width: `${percentage}%`,
                backgroundColor: cat.color || '#3B82F6',
              }}
              className="h-full transition-all duration-300 relative group"
              title={`${cat.emoji} ${cat.name}: ${score} pt(s) (${Math.round(percentage)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {categories.map((cat) => {
          const score = categoryScores[cat.id] || 0;
          if (score <= 0) return null;
          return (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full text-[11px]"
              style={{
                backgroundColor: `${cat.color}15`,
                color: cat.color,
              }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}: +{score}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
