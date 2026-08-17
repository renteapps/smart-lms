"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  EmptyState,
  Label,
  ProgressBar,
  SearchField,
  Table,
  buttonVariants,
} from "@heroui/react";
import {
  Building2,
  Plus,
  Users,
  CreditCard,
  Pencil,
  Trash2,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/editorial";
import { Company } from "@/types/business";
import { deleteCompany, getCompanies } from "@/lib/businessStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function AdminBusinessPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const loadCompanies = () => {
    setCompanies(getCompanies());
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleDelete = (company: Company) => {
    if (
      confirm(
        `Tem certeza que deseja excluir a empresa "${company.tradeName}" e todos os colaboradores vinculados?`
      )
    ) {
      deleteCompany(company.id);
      toast.success(`Empresa ${company.tradeName} removida com sucesso.`);
      loadCompanies();
    }
  };

  const filtered = companies.filter((c) => {
    const query = search.toLowerCase();
    const matchQuery =
      c.tradeName.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      c.cnpj.includes(query) ||
      c.managerName.toLowerCase().includes(query) ||
      (c.domain && c.domain.toLowerCase().includes(query));

    const matchStatus = statusFilter === "todos" || c.status === statusFilter;
    return matchQuery && matchStatus;
  });

  // Métricas Consolidadas
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => c.status === "ativo").length;
  const totalSeats = companies.reduce((acc, c) => acc + c.seatsTotal, 0);
  const totalSeatsUsed = companies.reduce((acc, c) => acc + c.seatsUsed, 0);
  const totalMRR = companies
    .filter((c) => c.status === "ativo")
    .reduce((acc, c) => acc + c.contractValue, 0);
  const avgOccupancy = totalSeats > 0 ? Math.round((totalSeatsUsed / totalSeats) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Vendas & Corporativo"
        title="Empresas & Gestão B2B"
        description="Gerencie os contratos corporativos, limite de licenças/vagas e pacotes de acesso para empresas parceiras."
        actions={
          <Link
            href="/admin/business/new"
            className={cn(buttonVariants({ variant: "primary" }), "gap-2 font-semibold")}
          >
            <Plus className="size-4" aria-hidden="true" /> Nova Empresa
          </Link>
        }
      />

      {/* KPIS CONSOLIDADOS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores B2B">
        <StatCard
          label="Empresas Parceiras"
          value={String(totalCompanies)}
          helper={`${activeCompanies} contratos ativos`}
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label="Vagas Totais Contratadas"
          value={`${totalSeatsUsed} / ${totalSeats}`}
          helper={`${totalSeats - totalSeatsUsed} licenças livres`}
          icon={Users}
          tone="sage"
        />
        <StatCard
          label="Receita Mensal B2B (MRR)"
          value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalMRR)}
          helper="Faturamento recorrente"
          icon={CreditCard}
          tone="terracotta"
        />
        <StatCard
          label="Taxa de Ocupação Média"
          value={`${avgOccupancy}%`}
          helper="Utilização das licenças"
          icon={TrendingUp}
          tone="neutral"
        />
      </section>

      {/* TABELA DE EMPRESAS */}
      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <SearchField
            value={search}
            onChange={setSearch}
            className="w-full sm:max-w-md"
            aria-label="Buscar empresa"
          >
            <Label className="sr-only">Buscar empresa</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Buscar por nome, CNPJ, domínio ou gestor..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativas</option>
              <option value="trial">Trial / Degustação</option>
              <option value="inativo">Inativas</option>
              <option value="suspenso">Suspensas</option>
            </select>
          </div>
        </Card.Header>

        <Card.Content className="px-0 pb-0 pt-0">
          {filtered.length === 0 ? (
            <EmptyState className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-surface-secondary text-muted">
                <Building2 className="size-6" />
              </div>
              <p className="font-semibold text-foreground">Nenhuma empresa encontrada</p>
              <p className="text-xs text-muted max-w-sm">
                {search || statusFilter !== "todos"
                  ? "Tente ajustar os critérios de busca."
                  : "Cadastre a primeira empresa corporativa para começar."}
              </p>
              <Link
                href="/admin/business/new"
                className={cn(buttonVariants({ variant: "primary", size: "sm" }), "gap-1 font-semibold")}
              >
                <Plus className="size-4 mr-1" /> Cadastrar Empresa
              </Link>
            </EmptyState>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Tabela de empresas corporativas">
                      <Table.Header>
                        <Table.Column isRowHeader>EMPRESA</Table.Column>
                        <Table.Column>GESTOR RESPONSÁVEL</Table.Column>
                        <Table.Column>VAGAS / OCUPAÇÃO</Table.Column>
                        <Table.Column>PLANO / VALOR</Table.Column>
                        <Table.Column>STATUS</Table.Column>
                        <Table.Column>AÇÕES</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {filtered.map((company) => {
                          const percent = Math.round((company.seatsUsed / company.seatsTotal) * 100);
                          return (
                            <Table.Row key={company.id}>
                              {/* EMPRESA */}
                              <Table.Cell>
                                <div className="flex items-center gap-3">
                                  <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-secondary">
                                    {company.logoUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={company.logoUrl}
                                        alt={company.tradeName}
                                        className="size-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex size-full items-center justify-center font-bold text-xs text-accent">
                                        {initials(company.tradeName)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="block text-sm font-bold text-foreground">
                                      {company.tradeName}
                                    </span>
                                    <span className="block text-xs text-muted truncate">
                                      {company.name} · <span className="font-mono">{company.cnpj}</span>
                                    </span>
                                    {company.domain && (
                                      <span className="text-[10px] text-accent font-mono block">
                                        @{company.domain}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Table.Cell>

                              {/* GESTOR */}
                              <Table.Cell>
                                <span className="block text-xs font-semibold text-foreground">
                                  {company.managerName}
                                </span>
                                <span className="block text-[11px] text-muted truncate">
                                  {company.managerEmail}
                                </span>
                              </Table.Cell>

                              {/* VAGAS */}
                              <Table.Cell>
                                <div className="w-36 space-y-1">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span>
                                      {company.seatsUsed} / {company.seatsTotal}
                                    </span>
                                    <span className="text-[11px] text-muted">{percent}%</span>
                                  </div>
                                  <ProgressBar
                                    value={percent}
                                    color={percent >= 90 ? "danger" : percent >= 75 ? "warning" : "accent"}
                                    className="h-1.5"
                                    aria-label={`Ocupação de ${company.tradeName}`}
                                  />
                                </div>
                              </Table.Cell>

                              {/* PLANO & VALOR */}
                              <Table.Cell>
                                <span className="block text-xs font-bold capitalize text-foreground">
                                  {company.planType.replace("_", " ")}
                                </span>
                                <span className="block text-xs font-mono text-muted">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(company.contractValue)}
                                  /mês
                                </span>
                              </Table.Cell>

                              {/* STATUS */}
                              <Table.Cell>
                                <StatusBadge
                                  tone={
                                    company.status === "ativo"
                                      ? "positive"
                                      : company.status === "trial"
                                      ? "primary"
                                      : "neutral"
                                  }
                                >
                                  {company.status}
                                </StatusBadge>
                              </Table.Cell>

                              {/* AÇÕES */}
                              <Table.Cell>
                                <div className="flex items-center gap-1">
                                  <Link
                                    href={`/empresa/gestao?empresaId=${company.id}`}
                                    className={cn(
                                      buttonVariants({ variant: "secondary", size: "sm" }),
                                      "text-xs gap-1 font-semibold"
                                    )}
                                    title="Acessar painel do gestor desta empresa"
                                  >
                                    <ExternalLink className="size-3.5" /> Portal
                                  </Link>

                                  <Link
                                    href={`/admin/business/${company.id}/editar`}
                                    className={cn(
                                      buttonVariants({ variant: "ghost", size: "sm" }),
                                      "size-8 p-0 grid place-items-center rounded-lg hover:bg-surface-secondary text-muted hover:text-foreground"
                                    )}
                                    title="Editar informações da empresa"
                                  >
                                    <Pencil className="size-3.5" />
                                  </Link>

                                  <Button
                                    isIconOnly
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Excluir"
                                    className="text-danger hover:bg-danger/10"
                                    onPress={() => handleDelete(company)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              {/* MOBILE LIST */}
              <ul className="divide-y divide-separator lg:hidden">
                {filtered.map((company) => (
                  <li key={company.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{company.tradeName}</h3>
                        <p className="text-xs text-muted font-mono">{company.cnpj}</p>
                      </div>
                      <StatusBadge tone={company.status === "ativo" ? "positive" : "neutral"}>
                        {company.status}
                      </StatusBadge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-surface-secondary/40 p-2.5 rounded-lg">
                      <div>
                        <span className="text-muted">Vagas:</span>{" "}
                        <strong className="text-foreground">
                          {company.seatsUsed} / {company.seatsTotal}
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted">Valor:</span>{" "}
                        <strong className="text-foreground">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            company.contractValue
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link
                        href={`/empresa/gestao?empresaId=${company.id}`}
                        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "text-xs gap-1")}
                      >
                        <ExternalLink className="size-3" /> Acessar Portal
                      </Link>
                      <Link
                        href={`/admin/business/${company.id}/editar`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
                      >
                        Editar
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>

    </div>
  );
}
