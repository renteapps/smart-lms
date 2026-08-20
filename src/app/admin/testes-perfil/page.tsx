'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProfileTest } from '@/types/profileTest';
import { createClient } from '@/lib/supabase/client';
import { getProfileTests } from '@/lib/data/profileTests';
import { TestCard } from '@/components/admin/profile-tests/TestCard';
import { TestPreview } from '@/components/admin/profile-tests/TestPreview';
import { PlusCircle, Sparkles, SlidersHorizontal, ClipboardCheck } from 'lucide-react';
import { Button, EmptyState, Label, SearchField, buttonVariants, toast } from '@heroui/react';
import { cn } from '@/lib/utils';

export default function ProfileTestsAdminPage() {
  const [tests, setTests] = useState<ProfileTest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [activePreviewTest, setActivePreviewTest] = useState<ProfileTest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = createClient();
      try {
        const data = await getProfileTests(supabase);
        setTests(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteTest = (testId: string) => {
    if (confirm('Tem certeza que deseja excluir este teste de perfil?')) {
      setTests(tests.filter((t) => t.id !== testId));
      toast.success('Teste de perfil excluído com sucesso.');
    }
  };

  const handleDuplicateTest = (test: ProfileTest) => {
    const duplicated: ProfileTest = {
      ...test,
      id: `test-${Date.now()}`,
      title: `${test.title} (Cópia)`,
      status: 'draft',
      completionsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTests([duplicated, ...tests]);
    toast.success('Teste duplicado como Rascunho!');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-accent font-bold text-sm mb-1">
            <ClipboardCheck className="w-5 h-5" />
            <span>ScoreApp Assessment Builder</span>
          </div>
          <h1 className="text-3xl font-display font-black text-foreground">
            Testes de Perfil & Diagnósticos
          </h1>
          <p className="text-muted text-sm mt-1">
            Crie testes comportamentais e mapeamentos de soft skills com pontuação por categorias de resultado.
          </p>
        </div>

        <Link href="/admin/testes-perfil/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2 shrink-0")}>
          <PlusCircle className="size-4" aria-hidden="true" />
          <span>Criar novo teste</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border/40 bg-surface p-4 shadow-elev-2 sm:flex-row sm:p-6">
        <SearchField value={searchTerm} onChange={setSearchTerm} className="w-full sm:w-96" aria-label="Buscar teste">
          <Label className="sr-only">Buscar teste</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar por título ou palavra-chave..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        {/* Status Filter Buttons */}
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
          <SlidersHorizontal className="hidden size-4 shrink-0 text-muted sm:block" aria-hidden="true" />
          <Button
            variant={statusFilter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            className="rounded-xl"
            onClick={() => setStatusFilter('all')}
          >
            Todos ({tests.length})
          </Button>

          <Button
            variant={statusFilter === 'published' ? 'primary' : 'secondary'}
            size="sm"
            className={cn("rounded-xl", statusFilter === 'published' && "bg-success text-success-foreground hover:bg-success-hover")}
            onClick={() => setStatusFilter('published')}
          >
            Publicados ({tests.filter((t) => t.status === 'published').length})
          </Button>

          <Button
            variant={statusFilter === 'draft' ? 'primary' : 'secondary'}
            size="sm"
            className={cn("rounded-xl", statusFilter === 'draft' && "bg-warning text-warning-foreground hover:bg-warning-hover")}
            onClick={() => setStatusFilter('draft')}
          >
            Rascunhos ({tests.filter((t) => t.status === 'draft').length})
          </Button>
        </div>
      </div>

      {/* Grid of Test Cards */}
      {filteredTests.length === 0 ? (
        <EmptyState className="mx-auto my-12 flex max-w-xl flex-col items-center gap-2 rounded-3xl border border-border/40 bg-surface p-12 text-center shadow-elev-1">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <h3 className="text-xl font-bold text-foreground">Nenhum teste encontrado</h3>
          <p className="text-sm text-muted">
            Não encontramos nenhum teste com o termo ou filtro selecionado. Tente buscar outro nome ou crie um novo teste.
          </p>
          <Link href="/admin/testes-perfil/novo" className={cn(buttonVariants({ variant: "primary" }), "mt-2 gap-2")}>
            <Sparkles className="size-4" aria-hidden="true" />
            Criar primeiro teste
          </Link>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onPreview={(t) => setActivePreviewTest(t)}
              onDelete={(id) => handleDeleteTest(id)}
              onDuplicate={(t) => handleDuplicateTest(t)}
            />
          ))}
        </div>
      )}

      {/* Modal Preview */}
      {activePreviewTest && (
        <TestPreview test={activePreviewTest} onClose={() => setActivePreviewTest(null)} />
      )}
    </div>
  );
}
