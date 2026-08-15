"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  ProgressBar,
  SearchField,
  Spinner,
  Table,
  buttonVariants,
} from "@heroui/react";
import {
  Building2,
  Users,
  UserPlus,
  Upload,
  BookOpen,
  Award,
  Clock3,
  TrendingUp,
  Download,
  Mail,
  Zap,
  Shield,
  UserX,
} from "lucide-react";
import { StatCard, StatusBadge } from "@/components/ui/editorial";
import {
  Company,
  CompanyAnalytics,
  CompanyMember,
} from "@/types/business";
import {
  deactivateMember,
  getCompanies,
  getCompanyAnalytics,
  getCompanyMembers,
  getSelectedCompanyId,
  resendInvite,
  setSelectedCompanyId,
} from "@/lib/businessStorage";
import { CATALOG_COURSES } from "@/lib/catalog";
import { InviteMemberModal } from "@/components/business/InviteMemberModal";
import { BulkInviteModal } from "@/components/business/BulkInviteModal";
import { AssignCourseModal } from "@/components/business/AssignCourseModal";
import { SeatsUpgradeModal } from "@/components/business/SeatsUpgradeModal";
import { useCompanyManager } from "@/hooks/useCompanyManager";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function EmpresaGestaoContent() {
  const searchParams = useSearchParams();
  const companyQueryId = searchParams.get("empresaId") || searchParams.get("id");

  const { isManager, isLoading: isManagerLoading, toggleSimulatedManager } = useCompanyManager();
  const { user } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null);

  // Filtros da tabela de colaboradores
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState<"visao" | "colaboradores" | "cursos" | "config">("colaboradores");

  // Modais
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<CompanyMember | null>(null);
  const [targetDepartment, setTargetDepartment] = useState<string | null>(null);

  const loadData = () => {
    const list = getCompanies();
    setCompanies(list);

    let activeId = companyQueryId || getSelectedCompanyId();
    let current = list.find((c) => c.id === activeId) || list[0] || null;

    if (current) {
      setSelectedCompany(current);
      setSelectedCompanyId(current.id);
      const mems = getCompanyMembers(current.id);
      setMembers(mems);
      const stats = getCompanyAnalytics(current.id);
      setAnalytics(stats);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyQueryId]);

  const handleSwitchCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const target = companies.find((c) => c.id === companyId);
    if (target) {
      setSelectedCompany(target);
      setMembers(getCompanyMembers(target.id));
      setAnalytics(getCompanyAnalytics(target.id));
      toast.info(`Alternado para o painel de ${target.tradeName}`);
    }
  };

  const handleResendInvite = (member: CompanyMember) => {
    const res = resendInvite(member.id);
    if (res.success) {
      toast.success(res.message);
      loadData();
    } else {
      toast.error(res.message);
    }
  };

  const handleDeactivateMember = (member: CompanyMember) => {
    if (confirm(`Deseja desativar o acesso de ${member.name}? A vaga será liberada imediatamente no plano.`)) {
      const ok = deactivateMember(member.id);
      if (ok) {
        toast.success(`Acesso de ${member.name} desativado. 1 vaga foi liberada!`);
        loadData();
      }
    }
  };

  const handleExportCSV = () => {
    if (!selectedCompany || members.length === 0) {
      toast.error("Nenhum dado para exportar.");
      return;
    }

    const headers = ["Nome", "E-mail", "Departamento", "Cargo", "Status", "Progresso (%)", "Cursos Concluídos", "Último Acesso"];
    const rows = members.map((m) => [
      `"${m.name}"`,
      `"${m.email}"`,
      `"${m.department}"`,
      `"${m.jobTitle || ""}"`,
      `"${m.status}"`,
      `"${m.progressPercentage}%"`,
      m.completedCoursesCount,
      `"${m.lastAccessAt || "Sem acesso"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_${selectedCompany.tradeName.toLowerCase()}_colaboradores.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório CSV exportado com sucesso!");
  };

  // CASO NÃO SEJA GESTOR: TELA DE ACESSO RESTRITO
  if (!isManager && !isManagerLoading) {
    return (
      <div className="editorial-container py-28 pb-20 max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <span className="grid size-16 mx-auto place-items-center rounded-3xl bg-accent-soft text-accent-soft-foreground shadow-surface">
            <Building2 className="size-8" />
          </span>
          <div className="space-y-2">
            <p className="eyebrow text-xs">Área Restrita</p>
            <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              Gestão Corporativa de Empresas
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted leading-relaxed">
              Esta área é destinada exclusivamente a gestores de Recursos Humanos, Treinamento & Desenvolvimento e administradores de empresas parceiras que contrataram licenças para seus funcionários.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <Card.Content className="p-5 space-y-2">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                <Users className="size-5" />
              </span>
              <h3 className="font-bold text-sm text-foreground">Vagas por Lote</h3>
              <p className="text-xs text-muted">
                Compre pacotes de licenças e distribua acessos para toda a sua equipe com 1 clique.
              </p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="p-5 space-y-2">
              <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
                <BookOpen className="size-5" />
              </span>
              <h3 className="font-bold text-sm text-foreground">Trilhas Corporativas</h3>
              <p className="text-xs text-muted">
                Atribua cursos customizados para setores específicos como Liderança, Engenharia e Vendas.
              </p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="p-5 space-y-2">
              <span className="grid size-10 place-items-center rounded-xl bg-warning-soft text-warning-soft-foreground">
                <TrendingUp className="size-5" />
              </span>
              <h3 className="font-bold text-sm text-foreground">Relatórios em Tempo Real</h3>
              <p className="text-xs text-muted">
                Acompanhe horas de estudo, conclusão de aulas e emissão de certificados dos colaboradores.
              </p>
            </Card.Content>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Voltar para o Início
          </Link>
          <Link href="/admin/business" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
            Painel do Administrador
          </Link>
          <Button
            variant="primary"
            size="lg"
            className="gap-2 font-bold"
            onPress={() => {
              toggleSimulatedManager(true);
              toast.success("Modo Gestor ativado com sucesso! Você agora tem acesso à gestão corporativa.");
            }}
          >
            <Zap className="size-4" /> Simular Acesso como Gestor
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="editorial-container py-28 text-center">
        <EmptyState className="flex flex-col items-center gap-3">
          <Building2 className="size-10 text-muted" />
          <p className="font-semibold text-foreground">Nenhuma empresa encontrada</p>
          <p className="text-sm text-muted">Acesse o painel administrativo para cadastrar empresas parceiras.</p>
          <Link href="/admin/business" className={buttonVariants({ variant: "primary" })}>
            Ir para Admin Business
          </Link>
        </EmptyState>
      </div>
    );
  }

  // Filtragem de colaboradores
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.jobTitle && m.jobTitle.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = selectedDept === "todos" || m.department === selectedDept;
    const matchesStatus = selectedStatus === "todos" || m.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const availableSeats = Math.max(
    0,
    selectedCompany.seatsTotal - members.filter((m) => m.status !== "desativado").length
  );
  const percentUsed = Math.round(
    ((selectedCompany.seatsTotal - availableSeats) / selectedCompany.seatsTotal) * 100
  );

  return (
    <div className="editorial-container space-y-8 pb-20 pt-28">
      {/* SELETOR RÁPIDO DE EMPRESA (MULTI-TENANT SWITCHER) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/80 p-3 backdrop-blur-xl shadow-surface">
        <div className="flex items-center gap-2 text-xs">
          <Building2 className="size-4 text-accent" />
          <span className="font-medium text-muted">Ambiente Corporativo Ativo:</span>
          <select
            value={selectedCompany.id}
            onChange={(e) => handleSwitchCompany(e.target.value)}
            className="rounded-lg border border-border bg-surface-secondary px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName} ({c.cnpj})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/business"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs gap-1.5")}
          >
            <Shield className="size-3.5" /> Visão Geral Admin
          </Link>
        </div>
      </div>

      {/* HEADER DA EMPRESA E PLANO */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface to-accent-soft/20 p-6 sm:p-8 shadow-surface">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface-secondary shadow-surface">
              {selectedCompany.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCompany.logoUrl}
                  alt={selectedCompany.tradeName}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center font-display text-2xl font-black text-accent">
                  {initials(selectedCompany.tradeName)}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
                  {selectedCompany.tradeName}
                </h1>
                <Chip variant="soft" color="accent" size="sm" className="font-bold capitalize">
                  Plano {selectedCompany.planType.replace("_", " ")}
                </Chip>
                <Chip
                  variant="soft"
                  color={selectedCompany.status === "ativo" ? "success" : "warning"}
                  size="sm"
                  className="font-semibold capitalize"
                >
                  {selectedCompany.status}
                </Chip>
              </div>

              <p className="mt-1 text-xs text-muted sm:text-sm">
                CNPJ: <span className="font-mono text-foreground">{selectedCompany.cnpj}</span> · Domínio:{" "}
                <span className="font-mono text-accent">{selectedCompany.domain || "Não configurado"}</span>
              </p>

              <p className="mt-2 text-xs text-muted">
                Gestor responsável: <strong className="text-foreground">{selectedCompany.managerName}</strong> (
                {selectedCompany.managerEmail})
              </p>
            </div>
          </div>

          {/* PAINEL RÁPIDO DE VAGAS */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/90 p-4 sm:min-w-80 backdrop-blur-md shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted">Ocupação de Vagas</span>
              <span className="font-bold text-foreground">
                {selectedCompany.seatsTotal - availableSeats} de {selectedCompany.seatsTotal} licenças ({percentUsed}%)
              </span>
            </div>

            <ProgressBar
              value={percentUsed}
              color={percentUsed >= 90 ? "danger" : percentUsed >= 75 ? "warning" : "accent"}
              className="h-2.5 rounded-full"
              aria-label="Progresso de vagas utilizadas"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted">
                <strong className={availableSeats > 0 ? "text-success font-bold" : "text-danger font-bold"}>
                  {availableSeats} {availableSeats === 1 ? "vaga livre" : "vagas livres"}
                </strong>{" "}
                restantes
              </span>

              <Button
                variant="primary"
                size="sm"
                className="text-xs gap-1 font-bold"
                onPress={() => setIsUpgradeModalOpen(true)}
              >
                <Zap className="size-3.5" /> Expandir Vagas
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO DO PORTAL */}
      <div className="flex border-b border-separator text-sm font-semibold">
        <button
          onClick={() => setActiveTab("colaboradores")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 transition-colors",
            activeTab === "colaboradores"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <Users className="size-4" /> Colaboradores & Vagas ({members.filter((m) => m.status !== "desativado").length})
        </button>

        <button
          onClick={() => setActiveTab("visao")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 transition-colors",
            activeTab === "visao"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <TrendingUp className="size-4" /> Visão Geral & Métricas
        </button>

        <button
          onClick={() => setActiveTab("cursos")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 transition-colors",
            activeTab === "cursos"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <BookOpen className="size-4" /> Cursos & Grade ({selectedCompany.allowedCourseIds.length})
        </button>

        <button
          onClick={() => setActiveTab("config")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 transition-colors",
            activeTab === "config"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <Shield className="size-4" /> Contrato & Regras
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: COLABORADORES & VAGAS */}
      {/* ========================================================================= */}
      {activeTab === "colaboradores" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Equipe & Licenças</h2>
              <p className="text-xs text-muted sm:text-sm">
                Gerencie os acessos individuais, envie convites e acompanhe a evolução de cada colaborador.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                onPress={handleExportCSV}
              >
                <Download className="size-3.5" /> Exportar CSV
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs font-semibold"
                onPress={() => setIsBulkModalOpen(true)}
              >
                <Upload className="size-3.5" /> Importar em Massa
              </Button>

              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 text-xs font-bold"
                onPress={() => setIsInviteModalOpen(true)}
                isDisabled={availableSeats <= 0}
              >
                <UserPlus className="size-3.5" /> Convidar Colaborador
              </Button>
            </div>
          </div>

          {/* BARRA DE BUSCA E FILTROS */}
          <Card>
            <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
              <SearchField
                value={search}
                onChange={setSearch}
                className="w-full sm:max-w-md"
                aria-label="Buscar colaborador"
              >
                <Label className="sr-only">Buscar colaborador</Label>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Buscar por nome, e-mail ou cargo..." />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="todos">Todos os Departamentos</option>
                  {selectedCompany.departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="ativo">Ativo</option>
                  <option value="convidado">Convite Pendente</option>
                  <option value="desativado">Desativado</option>
                </select>
              </div>
            </Card.Header>

            <Card.Content className="px-0 pb-0 pt-0">
              {filteredMembers.length === 0 ? (
                <EmptyState className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                  <div className="grid size-12 place-items-center rounded-2xl bg-surface-secondary text-muted">
                    <Users className="size-6" />
                  </div>
                  <p className="font-semibold text-foreground">Nenhum colaborador encontrado</p>
                  <p className="text-xs text-muted max-w-sm">
                    {search || selectedDept !== "todos" || selectedStatus !== "todos"
                      ? "Tente ajustar os filtros de busca para encontrar os colaboradores."
                      : "Comece convidando membros da sua equipe para iniciar os treinamentos."}
                  </p>
                  {availableSeats > 0 && (
                    <Button variant="primary" size="sm" onPress={() => setIsInviteModalOpen(true)}>
                      <UserPlus className="size-4 mr-1.5" /> Convidar Primeiro Colaborador
                    </Button>
                  )}
                </EmptyState>
              ) : (
                <>
                  {/* TABELA DESKTOP */}
                  <div className="hidden lg:block">
                    <Table.Root>
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Lista de colaboradores da empresa">
                          <Table.Header>
                            <Table.Column isRowHeader>COLABORADOR</Table.Column>
                            <Table.Column>DEPARTAMENTO / CARGO</Table.Column>
                            <Table.Column>PAPEL</Table.Column>
                            <Table.Column>PROGRESSO MÉDIO</Table.Column>
                            <Table.Column>STATUS</Table.Column>
                            <Table.Column>ÚLTIMO ACESSO</Table.Column>
                            <Table.Column>AÇÕES</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {filteredMembers.map((member) => (
                              <Table.Row key={member.id}>
                                <Table.Cell>
                                  <div className="flex items-center gap-3">
                                    <Avatar size="sm" color={member.status === "ativo" ? "accent" : "default"}>
                                      <Avatar.Fallback>{initials(member.name)}</Avatar.Fallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <span className="block text-sm font-semibold text-foreground">
                                        {member.name}
                                      </span>
                                      <span className="block text-xs text-muted truncate">{member.email}</span>
                                    </div>
                                  </div>
                                </Table.Cell>

                                <Table.Cell>
                                  <span className="block text-xs font-semibold text-foreground">
                                    {member.department}
                                  </span>
                                  <span className="block text-[11px] text-muted">{member.jobTitle || "—"}</span>
                                </Table.Cell>

                                <Table.Cell>
                                  <Chip variant="soft" size="sm" className="capitalize text-[11px]">
                                    {member.roleInCompany.replace("_", " ")}
                                  </Chip>
                                </Table.Cell>

                                <Table.Cell>
                                  <div className="w-32 space-y-1">
                                    <div className="flex justify-between text-xs font-medium">
                                      <span>{member.progressPercentage}%</span>
                                      <span className="text-[10px] text-muted">
                                        {member.completedCoursesCount} conc.
                                      </span>
                                    </div>
                                    <ProgressBar
                                      value={member.progressPercentage}
                                      color={member.progressPercentage >= 100 ? "success" : "accent"}
                                      className="h-1.5"
                                      aria-label={`Progresso de ${member.name}`}
                                    />
                                  </div>
                                </Table.Cell>

                                <Table.Cell>
                                  <StatusBadge
                                    tone={
                                      member.status === "ativo"
                                        ? "positive"
                                        : member.status === "convidado"
                                        ? "warning"
                                        : "neutral"
                                    }
                                  >
                                    {member.status === "ativo"
                                      ? "Ativo"
                                      : member.status === "convidado"
                                      ? "Pendente"
                                      : "Desativado"}
                                  </StatusBadge>
                                </Table.Cell>

                                <Table.Cell className="text-xs text-muted">{member.lastAccessAt || "—"}</Table.Cell>

                                <Table.Cell>
                                  <div className="flex items-center gap-1">
                                    {member.status === "convidado" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-accent"
                                        onPress={() => handleResendInvite(member)}
                                        aria-label="Reenviar convite de ativação por e-mail"
                                      >
                                        <Mail className="size-3.5 mr-1" /> Reenviar
                                      </Button>
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs"
                                      onPress={() => {
                                        setTargetMember(member);
                                        setTargetDepartment(null);
                                        setIsAssignModalOpen(true);
                                      }}
                                      aria-label="Atribuir ou alterar cursos deste colaborador"
                                    >
                                      <BookOpen className="size-3.5 mr-1" /> Cursos
                                    </Button>

                                    {member.status !== "desativado" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-danger hover:bg-danger/10"
                                        onPress={() => handleDeactivateMember(member)}
                                        aria-label="Desativar e liberar vaga no plano"
                                      >
                                        <UserX className="size-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table.Root>
                  </div>

                  {/* LISTA MOBILE */}
                  <ul className="divide-y divide-separator lg:hidden">
                    {filteredMembers.map((member) => (
                      <li key={member.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm" color="accent">
                              <Avatar.Fallback>{initials(member.name)}</Avatar.Fallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{member.name}</p>
                              <p className="text-xs text-muted">{member.email}</p>
                            </div>
                          </div>

                          <StatusBadge
                            tone={
                              member.status === "ativo"
                                ? "positive"
                                : member.status === "convidado"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {member.status}
                          </StatusBadge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-surface-secondary/50 p-2.5 rounded-lg">
                          <div>
                            <span className="text-muted">Setor:</span>{" "}
                            <strong className="text-foreground">{member.department}</strong>
                          </div>
                          <div>
                            <span className="text-muted">Progresso:</span>{" "}
                            <strong className="text-foreground">{member.progressPercentage}%</strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          {member.status === "convidado" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onPress={() => handleResendInvite(member)}
                            >
                              <Mail className="size-3 mr-1" /> Reenviar
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                            onPress={() => {
                              setTargetMember(member);
                              setTargetDepartment(null);
                              setIsAssignModalOpen(true);
                            }}
                          >
                            <BookOpen className="size-3 mr-1" /> Cursos
                          </Button>
                          {member.status !== "desativado" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-danger"
                              onPress={() => handleDeactivateMember(member)}
                            >
                              Desativar
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card.Content>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: VISÃO GERAL & MÉTRICAS */}
      {/* ========================================================================= */}
      {activeTab === "visao" && analytics && (
        <div className="space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="KPIs Corporativos">
            <StatCard
              label="Vagas em Uso"
              value={`${analytics.seatsUsed} / ${analytics.seatsTotal}`}
              helper={`${analytics.seatsAvailable} vagas livres restantes`}
              icon={Users}
              tone="primary"
            />
            <StatCard
              label="Ativos Esta Semana"
              value={String(analytics.activeThisWeek)}
              helper="Engajamento contínuo"
              icon={TrendingUp}
              tone="sage"
            />
            <StatCard
              label="Horas de Treinamento"
              value={`${analytics.totalHoursWatched}h`}
              helper="Acumuladas pela equipe"
              icon={Clock3}
              tone="terracotta"
            />
            <StatCard
              label="Certificados Emitidos"
              value={String(analytics.certificatesIssued)}
              helper="Conclusões com aprovação"
              icon={Award}
              tone="neutral"
            />
          </section>

          {/* DESEMPENHO POR DEPARTAMENTO */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <Card.Header>
                <Card.Title>Aproveitamento por Departamento</Card.Title>
                <Card.Description>Taxa de conclusão média e aderência por setor</Card.Description>
              </Card.Header>
              <Card.Content className="space-y-4">
                {analytics.departmentStats.map((dept) => (
                  <div key={dept.department} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{dept.department}</span>
                        <Chip variant="soft" size="sm" className="text-[10px]">
                          {dept.memberCount} pessoa(s)
                        </Chip>
                      </div>
                      <span className="font-bold text-accent">{dept.completionRate}% conc.</span>
                    </div>
                    <ProgressBar
                      value={dept.completionRate}
                      color="accent"
                      className="h-2 rounded-full"
                      aria-label={`Progresso de ${dept.department}`}
                    />
                  </div>
                ))}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Cursos Mais Acessados</Card.Title>
                <Card.Description>Participação da equipe nos conteúdos corporativos</Card.Description>
              </Card.Header>
              <Card.Content className="space-y-3">
                {analytics.courseStats.slice(0, 4).map((c) => (
                  <div
                    key={c.courseId}
                    className="flex items-center justify-between rounded-xl border border-border p-3 text-xs bg-surface-secondary/40"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-foreground truncate">{c.courseTitle}</p>
                      <p className="text-[11px] text-muted">
                        {c.enrolledCount} matriculados · {c.completedCount} concluíram
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-accent block">{c.avgProgress}%</span>
                      <span className="text-[10px] text-muted">média</span>
                    </div>
                  </div>
                ))}
              </Card.Content>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CURSOS & GRADE CORPORATIVA */}
      {/* ========================================================================= */}
      {activeTab === "cursos" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Grade de Cursos Contratada</h2>
              <p className="text-xs text-muted sm:text-sm">
                Cursos disponíveis no contrato da empresa. Você pode atribuir cursos inteiros a departamentos com 1 clique.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG_COURSES.filter((c) => selectedCompany.allowedCourseIds.includes(c.id)).map((course) => {
              const enrolledCount = members.filter((m) => m.assignedCourseIds?.includes(course.id)).length;
              return (
                <Card key={course.id} className="flex flex-col justify-between overflow-hidden">
                  <div className="relative aspect-video w-full overflow-hidden bg-surface-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={course.cover} alt={course.title} className="size-full object-cover" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-md">
                      {course.category}
                    </span>
                  </div>

                  <Card.Content className="space-y-3 flex-1 flex flex-col justify-between p-4">
                    <div>
                      <h3 className="font-bold text-sm text-foreground line-clamp-1">{course.title}</h3>
                      <p className="text-xs text-muted line-clamp-2 mt-1">{course.description}</p>
                    </div>

                    <div className="pt-2 border-t border-separator flex items-center justify-between text-xs">
                      <span className="text-muted">
                        <strong className="text-foreground">{enrolledCount}</strong> matriculados
                      </span>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs font-semibold"
                        onPress={() => {
                          setTargetMember(null);
                          setTargetDepartment(selectedCompany.departments[0] || "Geral");
                          setIsAssignModalOpen(true);
                        }}
                      >
                        Atribuir por Setor
                      </Button>
                    </div>
                  </Card.Content>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: CONFIGURAÇÕES & CONTRATO */}
      {/* ========================================================================= */}
      {activeTab === "config" && (
        <div className="space-y-6 max-w-4xl">
          <Card>
            <Card.Header>
              <Card.Title>Dados Cadastrais & Contrato</Card.Title>
              <Card.Description>Informações da conta corporativa e faturamento</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="p-3 rounded-xl border border-border bg-surface-secondary/30">
                  <span className="text-muted block">Razão Social:</span>
                  <strong className="text-foreground text-sm block mt-0.5">{selectedCompany.name}</strong>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-secondary/30">
                  <span className="text-muted block">Nome Fantasia:</span>
                  <strong className="text-foreground text-sm block mt-0.5">{selectedCompany.tradeName}</strong>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-secondary/30">
                  <span className="text-muted block">CNPJ:</span>
                  <strong className="text-foreground font-mono text-sm block mt-0.5">{selectedCompany.cnpj}</strong>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface-secondary/30">
                  <span className="text-muted block">Vigência do Contrato:</span>
                  <strong className="text-foreground text-sm block mt-0.5">
                    {selectedCompany.contractStart} até {selectedCompany.contractEnd}
                  </strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-accent/30 bg-accent-soft/20 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground">Domínio Corporativo para Auto-Admissão</p>
                  <p className="text-xs text-muted mt-0.5">
                    Qualquer colaborador com e-mail <code className="font-mono text-accent">@{selectedCompany.domain}</code> poderá se cadastrar automaticamente.
                  </p>
                </div>
                <Chip variant="soft" color="accent" size="sm" className="font-bold">
                  {selectedCompany.autoDomainApproval ? "Ativo" : "Desativado"}
                </Chip>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* MODAIS */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        company={selectedCompany}
        onSuccess={loadData}
      />

      <BulkInviteModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        company={selectedCompany}
        onSuccess={loadData}
      />

      <AssignCourseModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        company={selectedCompany}
        targetMember={targetMember}
        targetDepartment={targetDepartment}
        onSuccess={loadData}
      />

      <SeatsUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        company={selectedCompany}
        onSuccess={loadData}
      />
    </div>
  );
}

export default function EmpresaGestaoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <EmpresaGestaoContent />
    </Suspense>
  );
}
