"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { AdminEmptyState, PageHeader } from '@/components/ui/editorial';
import { ProfileTest } from '@/types/profileTest';
import { TestCard } from '@/components/admin/profile-tests/TestCard';
import { TestPreview } from '@/components/admin/profile-tests/TestPreview';
import { PlusCircle, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Button, Card, Label, SearchField, buttonVariants } from '@heroui/react';
import { toast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from '@/lib/utils';
import { deleteProfileTest, duplicateProfileTest } from '@/app/actions/admin/content';

interface AdminTestesPerfilClientProps {
  initialTests: ProfileTest[];
}

export function AdminTestesPerfilClient({ initialTests }: AdminTestesPerfilClientProps) {
  const [tests, setTests] = useState<ProfileTest[]>(initialTests);
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

  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!testToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteProfileTest(testToDelete);
      if (res.success) {
        setTests(tests.filter((t) => t.id !== testToDelete));
        toast.success('Teste de perfil excluído com sucesso.');
        setTestToDelete(null);
      } else {
        toast.danger('Erro ao excluir: ' + res.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateTest = async (test: ProfileTest) => {
    const loadingToast = toast.loading('Duplicando teste...');
    const res = await duplicateProfileTest(test.id);
    
    if (res.success) {
      toast.success('Teste duplicado como Rascunho!', { id: loadingToast });
      // Reload is handled by revalidatePath in the action, but we can optimistically update
      // Or just let the page reload. Next.js router.refresh() or just window.location.reload()
      // Let's just reload the page for simplicity since the list comes from server props
      window.location.reload();
    } else {
      toast.danger('Erro ao duplicar: ' + res.message, { id: loadingToast });
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-7">
      <PageHeader
        eyebrow="Aprendizagem"
        title="Testes de Perfil & Diagnósticos"
        description="Crie testes comportamentais e mapeamentos de soft skills com pontuação por categorias de resultado."
        actions={
          <Link href="/admin/testes-perfil/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
            <PlusCircle className="size-4" aria-hidden="true" />
            Criar novo teste
          </Link>
        }
      />

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
        <Card>
          <AdminEmptyState
            icon={Sparkles}
            title="Nenhum teste encontrado"
            description="Não encontramos nenhum teste com o termo ou filtro selecionado. Tente buscar outro nome ou crie um novo teste."
            action={
              <Link href="/admin/testes-perfil/novo" className={cn(buttonVariants({ variant: "primary" }), "gap-2")}>
                <PlusCircle className="size-4" aria-hidden="true" />
                Criar primeiro teste
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onPreview={(t) => setActivePreviewTest(t)}
              onDelete={(id) => setTestToDelete(id)}
              onDuplicate={(t) => handleDuplicateTest(t)}
            />
          ))}
        </div>
      )}

      {/* Modal Preview */}
      {activePreviewTest && (
        <TestPreview test={activePreviewTest} onClose={() => setActivePreviewTest(null)} />
      )}

      <ConfirmDialog
        isOpen={Boolean(testToDelete)}
        onOpenChange={(open) => {
          if (!open) setTestToDelete(null);
        }}
        title="Excluir teste de perfil"
        description="Tem certeza que deseja excluir este teste de perfil? O teste e suas categorias associadas serão removidos."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
