'use client';

import React, { useState } from 'react';
import {
  Edit3,
  Lightbulb,
  Plus,
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
  Clock,
  Heart,
} from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  ListBox,
  ListBoxItem,
  SearchField,
  Select,
  Table,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  toast,
} from '@heroui/react';
import { PageHeader, StatCard, StatusBadge } from '@/components/ui/editorial';
import { Pilula, PilulaStatus } from '@/types/pilula';
import { INITIAL_PILULAS } from '@/lib/mocks/pilulaMocks';
import { PilulaFormModal } from '@/components/admin/pilulas/PilulaFormModal';
import { PilulaPreviewModal } from '@/components/admin/pilulas/PilulaPreviewModal';
import { PilulaDeleteDialog } from '@/components/admin/pilulas/PilulaDeleteDialog';

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

  const draftCount = pilulas.filter((p) => p.status === 'Rascunho').length;

  const statusFilters: { id: PilulaStatus | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: pilulas.length },
    { id: 'Ativa', label: 'Ativas', count: activeCount },
    { id: 'Programada', label: 'Programadas', count: scheduledCount },
    { id: 'Rascunho', label: 'Rascunhos', count: draftCount },
  ];

  const isFiltering = searchTerm.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all';

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
    <div className="space-y-7">
      {/* Header */}
      <PageHeader
        eyebrow="Microlearning"
        title="Pílulas de Conhecimento"
        description="Crie práticas curtas e desafiadoras que conectam o conteúdo acadêmico à rotina diária dos alunos."
        actions={
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Nova pílula
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        {/* Controls: search + category + status */}
        <Card.Header className="flex flex-col gap-4 border-b border-separator pb-5 md:flex-row md:items-end md:justify-between">
          <SearchField value={searchTerm} onChange={setSearchTerm} className="w-full md:w-80">
            <Label>Buscar pílulas</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Buscar pílula ou prática…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex w-full flex-wrap items-end gap-3 md:w-auto">
            <Select
              selectedKey={categoryFilter}
              onSelectionChange={(key) => setCategoryFilter(String(key))}
              className="w-full sm:w-56"
            >
              <Label>Categoria</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {[{ id: 'all', label: 'Todas as categorias' }, ...categoriesList.map((cat) => ({ id: cat, label: cat }))].map(
                    (opt) => (
                      <ListBoxItem key={opt.id} id={opt.id}>
                        {opt.label}
                      </ListBoxItem>
                    ),
                  )}
                </ListBox>
              </Select.Popover>
            </Select>

            <ToggleButtonGroup
              aria-label="Filtrar por status"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={new Set([statusFilter])}
              onSelectionChange={(keys) => {
                const [first] = Array.from(keys);
                if (first) setStatusFilter(first as PilulaStatus | 'all');
              }}
              size="sm"
            >
              {statusFilters.map((filter) => (
                <ToggleButton key={filter.id} id={filter.id}>
                  {filter.label} ({filter.count})
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        </Card.Header>

        <Card.Content className="p-0">
          {filteredPilulas.length === 0 ? (
            <EmptyState className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="grid size-14 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Lightbulb className="size-7" aria-hidden="true" />
              </span>
              <h3 className="font-display text-lg font-bold text-foreground">Nenhuma pílula encontrada</h3>
              <p className="max-w-md text-sm text-muted">
                {isFiltering
                  ? 'Não encontramos nenhuma pílula com os critérios de busca ou filtros selecionados.'
                  : 'Você ainda não criou nenhuma pílula de conhecimento.'}
              </p>
              <Button variant="primary" onClick={handleOpenCreate}>
                <Plus className="size-4" aria-hidden="true" />
                Criar nova pílula
              </Button>
            </EmptyState>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Pílulas de conhecimento">
                      <Table.Header>
                        <Table.Column isRowHeader>Pílula e categoria</Table.Column>
                        <Table.Column>Prática sugerida</Table.Column>
                        <Table.Column>Duração e engajamento</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Ações</Table.Column>
                      </Table.Header>
                      <Table.Body items={filteredPilulas}>
                        {(item: Pilula) => {
                          const FormatIcon = iconForFormat(item.format);
                          return (
                            <Table.Row id={item.id}>
                              <Table.Cell>
                                <div className="flex max-w-xs items-start gap-3">
                                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning-soft-foreground">
                                    <FormatIcon className="size-4" aria-hidden="true" />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm leading-snug font-semibold text-foreground">
                                      {item.title}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                      <Chip color="default" variant="soft" size="sm">
                                        {item.category}
                                      </Chip>
                                      {item.courseTitle && (
                                        <span className="max-w-[150px] truncate text-xs font-medium text-accent">
                                          {item.courseTitle}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Table.Cell>

                              <Table.Cell>
                                <div className="max-w-md">
                                  <p className="line-clamp-2 text-sm leading-relaxed font-medium text-foreground">
                                    {item.challenge}
                                  </p>
                                  <p className="mt-1 line-clamp-1 text-xs text-muted">{item.summary}</p>
                                </div>
                              </Table.Cell>

                              <Table.Cell>
                                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                  <Clock className="size-3.5 text-muted" aria-hidden="true" />
                                  <span>{item.estimatedMinutes} min</span>
                                </div>
                                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="size-3 text-success" aria-hidden="true" />
                                    {item.completionsCount} conclusões
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Heart className="size-3 text-danger" aria-hidden="true" />
                                    {item.likesCount} curtidas
                                  </span>
                                </div>
                              </Table.Cell>

                              <Table.Cell>
                                <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
                                {item.status === 'Programada' && item.publishDate && (
                                  <p className="mt-1 text-xs tabular-nums text-muted">
                                    {new Date(item.publishDate).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </Table.Cell>

                              <Table.Cell>
                                <div className="flex justify-end gap-1">
                                  <Tooltip.Root>
                                    <Tooltip.Trigger>
                                      <Button
                                        isIconOnly
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Visualizar prévia de ${item.title}`}
                                        onClick={() => setPreviewPilula(item)}
                                      >
                                        <Eye className="size-4" aria-hidden="true" />
                                      </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Visualizar prévia</Tooltip.Content>
                                  </Tooltip.Root>

                                  <Tooltip.Root>
                                    <Tooltip.Trigger>
                                      <Button
                                        isIconOnly
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Duplicar ${item.title}`}
                                        onClick={() => handleDuplicate(item)}
                                      >
                                        <Copy className="size-4" aria-hidden="true" />
                                      </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Duplicar como rascunho</Tooltip.Content>
                                  </Tooltip.Root>

                                  <Tooltip.Root>
                                    <Tooltip.Trigger>
                                      <Button
                                        isIconOnly
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Editar ${item.title}`}
                                        onClick={() => handleOpenEdit(item)}
                                      >
                                        <Edit3 className="size-4" aria-hidden="true" />
                                      </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Editar pílula</Tooltip.Content>
                                  </Tooltip.Root>

                                  <Tooltip.Root>
                                    <Tooltip.Trigger>
                                      <Button
                                        isIconOnly
                                        variant="danger-soft"
                                        size="sm"
                                        aria-label={`Excluir ${item.title}`}
                                        onClick={() => setDeletePilulaTarget(item)}
                                      >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                      </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Excluir pílula</Tooltip.Content>
                                  </Tooltip.Root>
                                </div>
                              </Table.Cell>
                            </Table.Row>
                          );
                        }}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              {/* Mobile card list */}
              <ul className="divide-y divide-separator md:hidden">
                {filteredPilulas.map((item) => {
                  const FormatIcon = iconForFormat(item.format);
                  return (
                    <li key={item.id} className="space-y-3 p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning-soft-foreground">
                          <FormatIcon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base leading-snug font-semibold text-foreground">{item.title}</h3>
                            <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
                          </div>
                          <div className="mt-1">
                            <Chip color="default" variant="soft" size="sm">
                              {item.category}
                            </Chip>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted">{item.challenge}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden="true" />
                          {item.estimatedMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                          {item.completionsCount} conclusões
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(item)} className="flex-1">
                          <Edit3 className="size-4" aria-hidden="true" />
                          Editar
                        </Button>
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Visualizar prévia de ${item.title}`}
                          onClick={() => setPreviewPilula(item)}
                        >
                          <Eye className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          aria-label={`Duplicar ${item.title}`}
                          onClick={() => handleDuplicate(item)}
                        >
                          <Copy className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          isIconOnly
                          variant="danger-soft"
                          size="sm"
                          aria-label={`Excluir ${item.title}`}
                          onClick={() => setDeletePilulaTarget(item)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>

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
