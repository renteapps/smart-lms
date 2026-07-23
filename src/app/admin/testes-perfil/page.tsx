'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MOCK_PROFILE_TESTS } from '@/lib/mocks/profileTests';
import { ProfileTest } from '@/types/profileTest';
import { TestCard } from '@/components/admin/profile-tests/TestCard';
import { TestPreview } from '@/components/admin/profile-tests/TestPreview';
import { PlusCircle, Search, Sparkles, SlidersHorizontal, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileTestsAdminPage() {
  const [tests, setTests] = useState<ProfileTest[]>(MOCK_PROFILE_TESTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [activePreviewTest, setActivePreviewTest] = useState<ProfileTest | null>(null);

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
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <ClipboardCheck className="w-5 h-5" />
            <span>ScoreApp Assessment Builder</span>
          </div>
          <h1 className="text-3xl font-display font-black text-ink-deep">
            Testes de Perfil & Diagnósticos
          </h1>
          <p className="text-text-soft text-sm mt-1">
            Crie testes comportamentais e mapeamentos de soft skills com pontuação por categorias de resultado.
          </p>
        </div>

        <Link
          href="/admin/testes-perfil/novo"
          className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Criar Novo Teste</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-card rounded-2xl p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/40 flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-mute" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou palavra-chave..."
            className="w-full bg-canvas-soft border-transparent rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface transition-all text-text"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <SlidersHorizontal className="w-4 h-4 text-text-mute shrink-0 hidden sm:block" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-canvas-soft text-text-soft hover:bg-border/60'
            }`}
          >
            Todos ({tests.length})
          </button>

          <button
            onClick={() => setStatusFilter('published')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'published'
                ? 'bg-positive text-white shadow-sm'
                : 'bg-canvas-soft text-text-soft hover:bg-border/60'
            }`}
          >
            Publicados ({tests.filter((t) => t.status === 'published').length})
          </button>

          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'draft'
                ? 'bg-warning text-yellow-950 shadow-sm'
                : 'bg-canvas-soft text-text-soft hover:bg-border/60'
            }`}
          >
            Rascunhos ({tests.filter((t) => t.status === 'draft').length})
          </button>
        </div>
      </div>

      {/* Grid of Test Cards */}
      {filteredTests.length === 0 ? (
        <div className="bg-surface-card rounded-3xl p-12 text-center border border-border/40 shadow-sm space-y-4 max-w-xl mx-auto my-12">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h3 className="font-bold text-xl text-ink-deep">Nenhum teste encontrado</h3>
          <p className="text-text-soft text-sm">
            Não encontramos nenhum teste com o termo ou filtro selecionado. Tente buscar outro nome ou crie um novo teste.
          </p>
          <Link
            href="/admin/testes-perfil/novo"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold hover:bg-primary-active transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Criar Primeiro Teste
          </Link>
        </div>
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
