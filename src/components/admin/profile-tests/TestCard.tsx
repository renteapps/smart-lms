'use client';

import React from 'react';
import { ProfileTest } from '@/types/profileTest';
import { Edit3, Eye, Trash2, HelpCircle, Layers, Users, Copy, Globe, Lock, GraduationCap, CreditCard, Link2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@heroui/react';
import { StatusBadge } from '@/components/ui/editorial';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

        {/* Access Type Row */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Acesso</span>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              {test.accessType === 'public' && <><Globe className="w-3.5 h-3.5 text-success" /> Livre (sem conta)</>}
              {(!test.accessType || test.accessType === 'logged_in') && <><Lock className="w-3.5 h-3.5 text-accent" /> Apenas Logados</>}
              {test.accessType === 'course_owners' && <><GraduationCap className="w-3.5 h-3.5 text-warning" /> Restrito (Cursos)</>}
              {test.accessType === 'plan_owners' && <><CreditCard className="w-3.5 h-3.5 text-warning" /> Restrito (Planos)</>}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-full text-xs font-bold gap-1.5 bg-background-secondary border-border/50 hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all"
            onClick={() => {
              const url = `${window.location.origin}/diagnostico/${test.slug}`;
              navigator.clipboard.writeText(url);
              toast.success('Link do teste copiado para a área de transferência!');
            }}
          >
            <Link2 className="w-3.5 h-3.5" />
            Copiar Link
          </Button>
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
