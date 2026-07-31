'use client';

import React, { useState } from 'react';
import {
  Edit3,
  Lightbulb,
  Plus,
  Search,
  Trash2,
  Eye,
  Copy,
  Target,
  FileText,
  Video,
  Headphones,
  CheckCircle2,
  Calendar,
  Sparkles,
  SlidersHorizontal,
  Clock,
  Heart,
} from 'lucide-react';
import { PageHeader, StatCard, StatusBadge } from '@/components/ui/editorial';
import { Pilula, PilulaStatus } from '@/types/pilula';
import { INITIAL_PILULAS } from '@/lib/mocks/pilulaMocks';
import { PilulaFormModal } from '@/components/admin/pilulas/PilulaFormModal';
import { PilulaPreviewModal } from '@/components/admin/pilulas/PilulaPreviewModal';
import { PilulaDeleteDialog } from '@/components/admin/pilulas/PilulaDeleteDialog';
import { toast } from 'sonner';

const toneForStatus = (status: PilulaStatus) => {
  switch (status) {
    case 'Ativa':
      return 'positive' as const;
    case 'Programada':
      return 'primary' as const;
    case 'Rascunho':
      return 'warning' as const;
    case 'Arquivada':
      return 'neutral' as const;
    default:
      return 'neutral' as const;
  }
};

const iconForFormat = (format: string) => {
  switch (format) {
    case 'desafio':
      return Target;
    case 'texto':
      return FileText;
    case 'video':
      return Video;
    case 'audio':
      return Headphones;
    default:
      return Lightbulb;
  }
};

export default function AdminPilulasPage() {
  const [pilulas, setPilulas] = useState<Pilula[]>(INITIAL_PILULAS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PilulaStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pilulaToEdit, setPilulaToEdit] = useState<Pilula | null>(null);
  const [previewPilula, setPreviewPilula] = useState<Pilula | null>(null);
  const [deletePilulaTarget, setDeletePilulaTarget] = useState<Pilula | null>(null);

  // Filtered List
  const filteredPilulas = pilulas.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.challenge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.courseTitle && item.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate Metrics
  const totalPilulas = pilulas.length;
  const activeCount = pilulas.filter((p) => p.status === 'Ativa').length;
  const scheduledCount = pilulas.filter((p) => p.status === 'Programada').length;
  const totalCompletions = pilulas.reduce((acc, p) => acc + (p.completionsCount || 0), 0);

  // Extract available categories
  const categoriesList = Array.from(new Set(pilulas.map((p) => p.category)));

  // Handlers
  const handleOpenCreate = () => {
    setPilulaToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (pilula: Pilula) => {
    setPilulaToEdit(pilula);
    setIsFormOpen(true);
  };

  const handleSavePilula = (
    data: Omit<Pilula, 'id' | 'createdAt' | 'updatedAt' | 'completionsCount' | 'likesCount'> & { id?: string }
  ) => {
    const now = new Date().toISOString();

    if (data.id) {
      // Update
      setPilulas((prev) =>
        prev.map((item) =>
          item.id === data.id
            ? {
                ...item,
                ...data,
                updatedAt: now,
              }
            : item
        )
      );
      toast.success('Pílula atualizada com sucesso!');
    } else {
      // Create
      const newPilula: Pilula = {
        id: `pilula-${Date.now()}`,
        title: data.title,
        category: data.category,
        format: data.format,
        summary: data.summary,
        challenge: data.challenge,
        estimatedMinutes: data.estimatedMinutes,
        courseTitle: data.courseTitle,
        mediaUrl: data.mediaUrl,
        publishDate: data.publishDate,
        status: data.status,
        completionsCount: 0,
        likesCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      setPilulas([newPilula, ...pilulas]);
      toast.success('Pílula criada com sucesso!');
    }
  };

  const handleDuplicate = (item: Pilula) => {
    const now = new Date().toISOString();
    const duplicated: Pilula = {
      ...item,
      id: `pilula-${Date.now()}`,
      title: `${item.title} (Cópia)`,
      status: 'Rascunho',
      completionsCount: 0,
      likesCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    setPilulas([duplicated, ...pilulas]);
    toast.success('Pílula duplicada como rascunho!');
  };

  const handleDeleteConfirm = (id: string) => {
    setPilulas((prev) => prev.filter((p) => p.id !== id));
    setDeletePilulaTarget(null);
    toast.success('Pílula excluída com sucesso.');
  };

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <PageHeader
        eyebrow="Microlearning"
        title="Pílulas de Conhecimento"
        description="Crie práticas curtas e desafiadoras que conectam o conteúdo acadêmico à rotina diária dos alunos."
        actions={
          <button
            onClick={handleOpenCreate}
            className="inline-flex min-h-11 items-center gap-2 rounded-[11px] bg-primary px-5 text-sm font-bold text-on-primary hover:bg-primary-active shadow-sm transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4.5 w-4.5" /> Nova Pílula
          </button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Pílulas"
          value={totalPilulas.toString()}
          helper="Cadastradas na plataforma"
          icon={Lightbulb}
          tone="primary"
        />
        <StatCard
          label="Pílulas Ativas"
          value={activeCount.toString()}
          helper="Disponíveis para os alunos"
          icon={Sparkles}
          tone="sage"
        />
        <StatCard
          label="Programadas"
          value={scheduledCount.toString()}
          helper="Aguardando data de envio"
          icon={Calendar}
          tone="terracotta"
        />
        <StatCard
          label="Total de Conclusões"
          value={totalCompletions.toLocaleString()}
          helper="Ações práticas realizadas"
          icon={CheckCircle2}
          tone="neutral"
        />
      </div>

      {/* Controls Container (Search + Filter Tabs + Category Dropdown) */}
      <section className="editorial-card overflow-hidden">
        <div className="border-b border-border/70 p-4 sm:p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-canvas-soft/30">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <span className="sr-only">Buscar pílulas</span>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar pílula ou prática..."
              className="h-11 w-full rounded-[11px] border border-border bg-canvas-soft pl-10 pr-4 text-sm focus:border-primary focus:bg-surface focus:outline-none transition-all text-text placeholder:text-text-mute"
            />
          </div>

          {/* Filters right side */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Category Select */}
            <div className="flex items-center gap-1.5 bg-surface border border-border rounded-[11px] px-3 py-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-text-mute" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-text focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as categorias</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-canvas-soft p-1 rounded-[11px] border border-border/60 overflow-x-auto max-w-full">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-text-mute hover:text-text'
                }`}
              >
                Todas ({pilulas.length})
              </button>
              <button
                onClick={() => setStatusFilter('Ativa')}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all ${
                  statusFilter === 'Ativa'
                    ? 'bg-positive text-white shadow-xs'
                    : 'text-text-mute hover:text-text'
                }`}
              >
                Ativas ({pilulas.filter((p) => p.status === 'Ativa').length})
              </button>
              <button
                onClick={() => setStatusFilter('Programada')}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all ${
                  statusFilter === 'Programada'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-text-mute hover:text-text'
                }`}
              >
                Programadas ({pilulas.filter((p) => p.status === 'Programada').length})
              </button>
              <button
                onClick={() => setStatusFilter('Rascunho')}
                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all ${
                  statusFilter === 'Rascunho'
                    ? 'bg-warning text-yellow-950 shadow-xs'
                    : 'text-text-mute hover:text-text'
                }`}
              >
                Rascunhos ({pilulas.filter((p) => p.status === 'Rascunho').length})
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filteredPilulas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-primary-pale text-primary rounded-2xl flex items-center justify-center mx-auto text-xl">
              <Lightbulb className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-lg text-ink">Nenhuma pílula encontrada</h3>
            <p className="text-sm text-text-soft max-w-md mx-auto">
              Não encontramos nenhuma pílula com os critérios de busca ou filtros selecionados.
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary hover:bg-primary-active transition-all"
            >
              <Plus className="w-4 h-4" />
              Criar Nova Pílula
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-canvas-soft/75 text-[11px] font-bold uppercase tracking-[0.09em] text-text-mute border-b border-border/60">
                    <th className="px-5 py-3.5">Pílula & Categoria</th>
                    <th className="px-5 py-3.5">Prática Sugerida</th>
                    <th className="px-5 py-3.5">Duração & Engajamento</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="w-36 px-5 py-3.5 text-right">
                      <span>Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPilulas.map((item) => {
                    const FormatIcon = iconForFormat(item.format);
                    return (
                      <tr key={item.id} className="group border-t border-border/70 hover:bg-primary-pale/20 transition-colors">
                        {/* Title & Category */}
                        <td className="px-5 py-4 align-top max-w-xs">
                          <div className="flex items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent-orange/12 text-accent-orange">
                              <FormatIcon className="h-4.5 w-4.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-ink text-sm leading-snug line-clamp-2">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-canvas-soft text-text-soft border border-border/50">
                                  {item.category}
                                </span>
                                {item.courseTitle && (
                                  <span className="text-[10px] font-semibold text-primary truncate max-w-[150px]" title={item.courseTitle}>
                                    {item.courseTitle}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Practical Challenge */}
                        <td className="max-w-md px-5 py-4 text-sm leading-relaxed text-text-soft align-top">
                          <p className="line-clamp-2 text-ink/90 font-medium">{item.challenge}</p>
                          <p className="text-xs text-text-mute line-clamp-1 mt-1 italic">{item.summary}</p>
                        </td>

                        {/* Duration & Engagement */}
                        <td className="px-5 py-4 align-top text-xs text-text-mute">
                          <div className="flex items-center gap-1.5 font-semibold text-text">
                            <Clock className="w-3.5 h-3.5 text-text-mute" />
                            <span>{item.estimatedMinutes} min</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1" title="Alunos concluíram">
                              <CheckCircle2 className="w-3 h-3 text-positive" />
                              <span>{item.completionsCount}</span>
                            </span>
                            <span className="flex items-center gap-1" title="Curtidas">
                              <Heart className="w-3 h-3 text-negative" />
                              <span>{item.likesCount}</span>
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 align-top">
                          <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
                          {item.status === 'Programada' && item.publishDate && (
                            <p className="text-[10px] text-text-mute mt-1 font-mono">
                              {new Date(item.publishDate).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 align-top text-right">
                          <div className="flex justify-end gap-1 opacity-100 md:opacity-80 md:group-hover:opacity-100 transition-opacity">
                            {/* Preview */}
                            <button
                              onClick={() => setPreviewPilula(item)}
                              aria-label={`Visualizar ${item.title}`}
                              title="Visualizar Prévia"
                              className="grid h-9 w-9 place-items-center rounded-[10px] text-text-mute hover:bg-canvas-alt hover:text-text transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Duplicate */}
                            <button
                              onClick={() => handleDuplicate(item)}
                              aria-label={`Duplicar ${item.title}`}
                              title="Duplicar como Rascunho"
                              className="grid h-9 w-9 place-items-center rounded-[10px] text-text-mute hover:bg-canvas-alt hover:text-text transition-colors"
                            >
                              <Copy className="h-4 w-4" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEdit(item)}
                              aria-label={`Editar ${item.title}`}
                              title="Editar Pílula"
                              className="grid h-9 w-9 place-items-center rounded-[10px] text-text-mute hover:bg-primary-pale hover:text-primary transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeletePilulaTarget(item)}
                              aria-label={`Excluir ${item.title}`}
                              title="Excluir Pílula"
                              className="grid h-9 w-9 place-items-center rounded-[10px] text-text-mute hover:bg-negative/10 hover:text-negative transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="divide-y divide-border md:hidden">
              {filteredPilulas.map((item) => {
                const FormatIcon = iconForFormat(item.format);
                return (
                  <article key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent-orange/12 text-accent-orange">
                        <FormatIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-ink text-base leading-snug">{item.title}</h3>
                          <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-canvas-soft text-text-soft">
                          {item.category}
                        </span>
                        <p className="mt-2 text-sm leading-relaxed text-text-soft">{item.challenge}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-xs text-text-mute border-t border-border/40">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {item.estimatedMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                          {item.completionsCount} conclusões
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewPilula(item)}
                          className="p-2 rounded-lg text-text-mute hover:bg-canvas-soft"
                          title="Prévia"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(item)}
                          className="p-2 rounded-lg text-text-mute hover:bg-canvas-soft"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-3 py-1.5 rounded-lg bg-primary-pale text-xs font-bold text-primary-active"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeletePilulaTarget(item)}
                          className="p-2 rounded-lg text-negative hover:bg-negative/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Form Modal (Create / Edit) */}
      <PilulaFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSavePilula}
        pilulaToEdit={pilulaToEdit}
      />

      {/* Preview Modal */}
      <PilulaPreviewModal
        pilula={previewPilula}
        onClose={() => setPreviewPilula(null)}
      />

      {/* Delete Confirmation Dialog */}
      <PilulaDeleteDialog
        pilula={deletePilulaTarget}
        onClose={() => setDeletePilulaTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
