'use client';

import React from 'react';
import { ProfileTest } from '@/types/profileTest';
import { Edit3, Eye, Trash2, HelpCircle, Layers, Users, Copy } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@heroui/react';
import { StatusBadge } from '@/components/ui/editorial';
import { cn } from '@/lib/utils';

interface TestCardProps {
  test: ProfileTest;
  onPreview: (test: ProfileTest) => void;
  onDelete: (testId: string) => void;
  onDuplicate: (test: ProfileTest) => void;
}

export const TestCard: React.FC<TestCardProps> = ({ test, onPreview, onDelete, onDuplicate }) => {
  const isPublished = test.status === 'published';

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-elev-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-elev-3">

      {/* Thumbnail Header */}
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-r from-accent/10 via-accent/20 to-accent-soft">
        {test.coverUrl ? (
          <Image
            src={test.coverUrl}
            alt={test.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-[var(--duration-lg)] group-hover:scale-[1.035]"
          />
        ) : (
          <div className="p-4 text-center">
            <span className="mb-1 block text-4xl">📊</span>
            <span className="text-xs font-semibold text-muted">Teste de Perfil</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute right-3 top-3">
          <StatusBadge tone={isPublished ? 'positive' : 'warning'}>
            {isPublished ? 'Publicado' : 'Rascunho'}
          </StatusBadge>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-display font-black text-xl text-foreground group-hover:text-accent transition-colors line-clamp-1 mb-2">
            {test.title}
          </h3>
          <p className="text-muted text-sm line-clamp-2 leading-relaxed">
            {test.description || 'Sem descrição.'}
          </p>
        </div>

        {/* Categories Chips preview */}
        {test.categories && test.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {test.categories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${cat.color}15`,
                  color: cat.color,
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/40 text-center">
          <div>
            <span className="text-xs font-semibold text-muted flex items-center justify-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Perguntas
            </span>
            <span className="text-sm font-extrabold text-foreground">{test.questions.length}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted flex items-center justify-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Perfis
            </span>
            <span className="text-sm font-extrabold text-foreground">{test.categories.length}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" /> Respostas
            </span>
            <span className="text-sm font-extrabold text-foreground">{test.completionsCount || 0}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Link
            href={`/admin/testes-perfil/${test.id}`}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "flex-1 gap-1.5")}
          >
            <Edit3 className="size-3.5" aria-hidden="true" />
            Editar
          </Link>

          <Button
            isIconOnly
            variant="outline"
            size="sm"
            aria-label="Preview do aluno"
            onClick={() => onPreview(test)}
          >
            <Eye className="size-4" aria-hidden="true" />
          </Button>

          <Button
            isIconOnly
            variant="outline"
            size="sm"
            aria-label="Duplicar teste"
            onClick={() => onDuplicate(test)}
          >
            <Copy className="size-4" aria-hidden="true" />
          </Button>

          <Button
            isIconOnly
            variant="outline"
            size="sm"
            aria-label="Excluir teste"
            className="hover:bg-danger-soft hover:text-danger-soft-foreground"
            onClick={() => onDelete(test.id)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>

      </div>
    </div>
  );
};
