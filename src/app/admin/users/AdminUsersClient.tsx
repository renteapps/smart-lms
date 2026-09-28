"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar, Button, Card, Label, SearchField, Table, buttonVariants } from "@heroui/react";
import { AdminEmptyState, StatCard, StatusBadge } from "@/components/ui/editorial";
import { NativeSelect } from "@/components/ui/NativeSelect";
import { cn } from "@/lib/utils";
import type {
  AdminUserRow,
  AdminUsersMetrics,
  AdminUsersFilterOptions,
  AdminUserFilterParams,
  AdminUserSortField,
  AdminUserRoleFilter,
  AdminUserStatusFilter,
  AdminUserAccessFilter,
} from "@/lib/data/usersAdmin";

type AdminUsersClientProps = {
  users: AdminUserRow[];
  metrics: AdminUsersMetrics;
  filterOptions: AdminUsersFilterOptions;
  currentFilters: AdminUserFilterParams;
  totalCount: number;
  totalPages: number;
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function formatDate(isoString?: string): string {
  if (!isoString) return "Nunca";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Nunca";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(isoString?: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminUsersClient({
  users,
  metrics,
  filterOptions,
  currentFilters,
  totalCount,
  totalPages,
}: AdminUsersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(currentFilters.q);
  const [prevSearchFilter, setPrevSearchFilter] = useState(currentFilters.q);
  if (prevSearchFilter !== currentFilters.q) {
    setPrevSearchFilter(currentFilters.q);
    setSearchTerm(currentFilters.q);
  }

  const updateFilters = (newParams: Partial<AdminUserFilterParams>) => {
    const params = new URLSearchParams();

    const merged: AdminUserFilterParams = {
      ...currentFilters,
      ...newParams,
    };

    // Reseta página para 1 se algum filtro além de página foi alterado
    if (!("page" in newParams)) {
      merged.page = 1;
    }

    if (merged.q) params.set("q", merged.q);
    if (merged.sort && merged.sort !== "created_at") params.set("sort", merged.sort);
    if (merged.dir && (merged.dir !== "desc" || merged.sort === "full_name")) params.set("dir", merged.dir);
    if (merged.role && merged.role !== "all") params.set("role", merged.role);
    if (merged.status && merged.status !== "all") params.set("status", merged.status);
    if (merged.plan && merged.plan !== "all") params.set("plan", merged.plan);
    if (merged.course && merged.course !== "all") params.set("course", merged.course);
    if (merged.access && merged.access !== "all") params.set("access", merged.access);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));

    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.push(url);
    });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateFilters({ q: searchTerm.trim() });
  };

  const handleClearAll = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleSortToggle = (field: AdminUserSortField) => {
    if (currentFilters.sort === field) {
      // Inverte direção
      updateFilters({ dir: currentFilters.dir === "asc" ? "desc" : "asc" });
    } else {
      // Novo campo: se for nome, padrão é asc; se for data, desc
      const defaultDir = field === "full_name" ? "asc" : "desc";
      updateFilters({ sort: field, dir: defaultDir });
    }
  };

  const hasActiveFilters =
    Boolean(currentFilters.q) ||
    currentFilters.sort !== "created_at" ||
    currentFilters.dir !== "desc" ||
    currentFilters.role !== "all" ||
    currentFilters.status !== "all" ||
    currentFilters.plan !== "all" ||
    currentFilters.course !== "all" ||
    currentFilters.access !== "all" ||
    currentFilters.page > 1;

  const currentSortKey = `${currentFilters.sort}:${currentFilters.dir}`;

  const renderSortIndicator = (field: AdminUserSortField) => {
    if (currentFilters.sort !== field) {
      return <ArrowUpDown className="size-3.5 opacity-40 group-hover:opacity-80" aria-hidden="true" />;
    }
    return currentFilters.dir === "asc" ? (
      <ArrowUp className="size-3.5 text-accent" aria-hidden="true" />
    ) : (
      <ArrowDown className="size-3.5 text-accent" aria-hidden="true" />
    );
  };

  return (
    <div className="space-y-7">
      {/* 1. KPIs no topo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total de Usuários"
          value={metrics.totalUsers.toString()}
          helper="Cadastrados na plataforma"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Alunos Ativos"
          value={metrics.activeStudents.toString()}
          helper="Com perfil ativo"
          icon={GraduationCap}
          tone="sage"
        />
        <StatCard
          label="Planos Ativos"
          value={metrics.usersWithActivePlan.toString()}
          helper="Com assinatura vigente"
          icon={CreditCard}
          tone="terracotta"
        />
        <StatCard
          label="Acessos Recentes"
          value={metrics.recentActiveUsers.toString()}
          helper="Nos últimos 7 dias"
          icon={Clock}
          tone="neutral"
        />
      </div>

      {/* 2. Card Principal com Filtros e Tabela */}
      <Card>
        <Card.Header className="flex flex-col gap-4 border-b border-separator pb-5">
          {/* Linha 1: Busca e Resumo */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-md">
              <SearchField
                value={searchTerm}
                onChange={setSearchTerm}
                onClear={() => {
                  setSearchTerm("");
                  updateFilters({ q: "" });
                }}
                aria-label="Buscar usuário"
              >
                <Label className="sr-only">Buscar usuário</Label>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Buscar por nome ou e-mail..." />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
            </form>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                Mostrando <strong className="font-semibold text-foreground">{users.length}</strong> de{" "}
                <strong className="font-semibold text-foreground">{totalCount}</strong> pessoas
              </span>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs text-muted hover:text-foreground"
                  onPress={handleClearAll}
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Linha 2: Barra de Filtros e Ordenação */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {/* Seletor de Ordenação */}
            <div>
              <Label className="mb-1 block text-xs font-medium text-muted">Ordenar por</Label>
              <NativeSelect
                aria-label="Ordenar usuários"
                value={currentSortKey}
                onChange={(e) => {
                  const [sortField, sortDir] = e.target.value.split(":") as [AdminUserSortField, "asc" | "desc"];
                  updateFilters({ sort: sortField, dir: sortDir });
                }}
                className="text-xs h-9"
              >
                <option value="created_at:desc">Cadastro (Mais recente)</option>
                <option value="created_at:asc">Cadastro (Mais antigo)</option>
                <option value="last_access_at:desc">Último acesso (Mais recente)</option>
                <option value="last_access_at:asc">Último acesso (Mais antigo)</option>
                <option value="full_name:asc">Nome (A - Z)</option>
                <option value="full_name:desc">Nome (Z - A)</option>
              </NativeSelect>
            </div>

            {/* Filtro de Planos */}
            <div>
              <Label className="mb-1 block text-xs font-medium text-muted">Plano</Label>
              <NativeSelect
                aria-label="Filtrar por plano"
                value={currentFilters.plan}
                onChange={(e) => updateFilters({ plan: e.target.value })}
                className="text-xs h-9"
              >
                <option value="all">Todos os planos</option>
                <option value="with_plan">Com plano ativo</option>
                <option value="no_plan">Sem plano ativo</option>
                {filterOptions.plans.length > 0 && (
                  <optgroup label="Planos específicos">
                    {filterOptions.plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </NativeSelect>
            </div>

            {/* Filtro de Produtos / Matrículas */}
            <div>
              <Label className="mb-1 block text-xs font-medium text-muted">Produto / Curso</Label>
              <NativeSelect
                aria-label="Filtrar por produto ou matrícula"
                value={currentFilters.course}
                onChange={(e) => updateFilters({ course: e.target.value })}
                className="text-xs h-9"
              >
                <option value="all">Todos os produtos</option>
                <option value="with_course">Com matrícula ativa</option>
                <option value="no_course">Sem matrícula ativa</option>
                {filterOptions.courses.length > 0 && (
                  <optgroup label="Cursos específicos">
                    {filterOptions.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </optgroup>
                )}
              </NativeSelect>
            </div>

            {/* Filtro de Papel */}
            <div>
              <Label className="mb-1 block text-xs font-medium text-muted">Papel</Label>
              <NativeSelect
                aria-label="Filtrar por papel"
                value={currentFilters.role}
                onChange={(e) => updateFilters({ role: e.target.value as AdminUserRoleFilter })}
                className="text-xs h-9"
              >
                <option value="all">Todos os papéis</option>
                <option value="student">Alunos</option>
                <option value="instructor">Instrutores</option>
                <option value="admin">Administradores</option>
              </NativeSelect>
            </div>

            {/* Filtro de Status */}
            <div>
              <Label className="mb-1 block text-xs font-medium text-muted">Status</Label>
              <NativeSelect
                aria-label="Filtrar por status"
                value={currentFilters.status}
                onChange={(e) => updateFilters({ status: e.target.value as AdminUserStatusFilter })}
                className="text-xs h-9"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </NativeSelect>
            </div>

            {/* Filtro de Recência de Acesso */}
            <div>
              <Label className="mb-1 block text-xs font-medium text-muted">Último Acesso</Label>
              <NativeSelect
                aria-label="Filtrar por recência de acesso"
                value={currentFilters.access}
                onChange={(e) => updateFilters({ access: e.target.value as AdminUserAccessFilter })}
                className="text-xs h-9"
              >
                <option value="all">Qualquer período</option>
                <option value="today">Hoje</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="over_30d">Mais de 30 dias</option>
                <option value="never">Nunca acessou</option>
              </NativeSelect>
            </div>
          </div>
        </Card.Header>

        {/* 3. Conteúdo da Tabela / Lista */}
        <Card.Content className={cn("px-0 pb-0", isPending && "opacity-60 transition-opacity")}>
          {users.length === 0 ? (
            <div className="py-8">
              <AdminEmptyState
                icon={UserRound}
                title="Nenhuma pessoa encontrada"
                description="Ajuste os filtros ou o termo de busca para encontrar quem você procura."
                action={
                  hasActiveFilters ? (
                    <Button variant="secondary" size="sm" onPress={handleClearAll}>
                      Limpar filtros
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Usuários da plataforma">
                      <Table.Header>
                        <Table.Column isRowHeader>
                          <button
                            type="button"
                            onClick={() => handleSortToggle("full_name")}
                            className="group flex items-center gap-1.5 font-semibold text-foreground hover:text-accent focus:outline-none"
                          >
                            Pessoa
                            {renderSortIndicator("full_name")}
                          </button>
                        </Table.Column>
                        <Table.Column>Papel</Table.Column>
                        <Table.Column>Plano Ativo</Table.Column>
                        <Table.Column>Matrículas</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>
                          <button
                            type="button"
                            onClick={() => handleSortToggle("last_access_at")}
                            className="group flex items-center gap-1.5 font-semibold text-foreground hover:text-accent focus:outline-none"
                          >
                            Último acesso
                            {renderSortIndicator("last_access_at")}
                          </button>
                        </Table.Column>
                        <Table.Column>
                          <button
                            type="button"
                            onClick={() => handleSortToggle("created_at")}
                            className="group flex items-center gap-1.5 font-semibold text-foreground hover:text-accent focus:outline-none"
                          >
                            Cadastro
                            {renderSortIndicator("created_at")}
                          </button>
                        </Table.Column>
                        <Table.Column className="text-right">Ações</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {users.map((user) => {
                          const roleDisplay =
                            user.role === "admin"
                              ? "Administrador"
                              : user.role === "instructor"
                                ? "Instrutor"
                                : "Aluno";
                          const statusDisplay = user.status === "active" ? "Ativo" : "Inativo";

                          return (
                            <Table.Row key={user.id} id={user.id}>
                              <Table.Cell>
                                <Link href={`/admin/users/${user.id}`} className="group flex items-center gap-3">
                                  <Avatar size="sm" color="accent">
                                    <Avatar.Fallback>{initials(user.fullName)}</Avatar.Fallback>
                                  </Avatar>
                                  <span className="block min-w-0">
                                    <span className="block truncate text-sm font-semibold text-foreground group-hover:text-accent">
                                      {user.fullName}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-muted">{user.email}</span>
                                  </span>
                                </Link>
                              </Table.Cell>
                              <Table.Cell>
                                <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                                  {user.role === "admin" && <ShieldCheck className="size-3.5 text-accent" />}
                                  {user.role === "instructor" && <BookOpen className="size-3.5 text-success" />}
                                  {user.role === "student" && <GraduationCap className="size-3.5 text-muted" />}
                                  {roleDisplay}
                                </span>
                              </Table.Cell>
                              <Table.Cell>
                                {user.activePlanName ? (
                                  <span className="inline-flex items-center rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent-soft-foreground">
                                    {user.activePlanName}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted">Sem plano</span>
                                )}
                              </Table.Cell>
                              <Table.Cell>
                                {user.activeEnrollmentsCount > 0 ? (
                                  <span className="inline-flex items-center rounded-md bg-success-soft px-2 py-1 text-xs font-medium text-success-soft-foreground">
                                    {user.activeEnrollmentsCount}{" "}
                                    {user.activeEnrollmentsCount === 1 ? "curso" : "cursos"}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted">Nenhum</span>
                                )}
                              </Table.Cell>
                              <Table.Cell>
                                <StatusBadge tone={statusDisplay === "Ativo" ? "positive" : "negative"}>
                                  {statusDisplay}
                                </StatusBadge>
                              </Table.Cell>
                              <Table.Cell className="text-xs text-muted">{formatDate(user.lastAccessAt)}</Table.Cell>
                              <Table.Cell className="text-xs text-muted">{formatShortDate(user.createdAt)}</Table.Cell>
                              <Table.Cell className="text-right">
                                <Link
                                  href={`/admin/users/${user.id}`}
                                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                                >
                                  Gerenciar
                                </Link>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              {/* Lista Mobile */}
              <ul className="divide-y divide-separator md:hidden">
                {users.map((user) => {
                  const roleDisplay =
                    user.role === "admin"
                      ? "Administrador"
                      : user.role === "instructor"
                        ? "Instrutor"
                        : "Aluno";
                  const statusDisplay = user.status === "active" ? "Ativo" : "Inativo";

                  return (
                    <li key={user.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar size="sm" color="accent">
                          <Avatar.Fallback>{initials(user.fullName)}</Avatar.Fallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/users/${user.id}`} className="block font-semibold leading-5 text-foreground">
                            {user.fullName}
                          </Link>
                          <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
                        </div>
                        <StatusBadge tone={statusDisplay === "Ativo" ? "positive" : "negative"}>
                          {statusDisplay}
                        </StatusBadge>
                      </div>

                      <dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-background-secondary p-3 text-xs sm:grid-cols-4">
                        <div>
                          <dt className="text-muted">Papel</dt>
                          <dd className="mt-0.5 font-semibold text-foreground">{roleDisplay}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Plano</dt>
                          <dd className="mt-0.5 font-semibold text-foreground">
                            {user.activePlanName || "Sem plano"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Matrículas</dt>
                          <dd className="mt-0.5 font-semibold text-foreground">
                            {user.activeEnrollmentsCount}{" "}
                            {user.activeEnrollmentsCount === 1 ? "curso" : "cursos"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Último Acesso</dt>
                          <dd className="mt-0.5 truncate font-semibold text-foreground">
                            {user.lastAccessAt ? formatShortDate(user.lastAccessAt) : "Nunca"}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-muted">Cadastrado em {formatShortDate(user.createdAt)}</span>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className={buttonVariants({ variant: "secondary", size: "sm" })}
                        >
                          Gerenciar
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* 4. Barra de Paginação */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-separator px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted">
                    Página <strong className="font-semibold text-foreground">{currentFilters.page}</strong> de{" "}
                    <strong className="font-semibold text-foreground">{totalPages}</strong> (total de{" "}
                    {totalCount} pessoas)
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                      isDisabled={currentFilters.page <= 1 || isPending}
                      onPress={() => updateFilters({ page: currentFilters.page - 1 })}
                    >
                      <ChevronLeft className="size-4" aria-hidden="true" />
                      Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                      isDisabled={currentFilters.page >= totalPages || isPending}
                      onPress={() => updateFilters({ page: currentFilters.page + 1 })}
                    >
                      Próxima
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
