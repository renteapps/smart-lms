"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Mail,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { Button, Card } from "@heroui/react";
import { Company, CompanyPlanType, CompanyStatus } from "@/types/business";
import { saveCompany } from "@/app/actions/admin/platform";
import { StatusBadge } from "@/components/ui/editorial";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface CompanyFormProps {
  initialCompany?: Company | null;
  mode?: "create" | "edit";
  availableCourses?: any[];
}

const DEFAULT_DEPARTMENTS = [
  "RH & Gente",
  "Tecnologia",
  "Vendas & Comercial",
  "Marketing",
  "Operações",
  "Financeiro",
];

export function CompanyForm({ initialCompany, mode = "create", availableCourses = [] }: CompanyFormProps) {
  const router = useRouter();

  const isEditing = mode === "edit" || !!initialCompany;

  // 1. Identificação
  const [tradeName, setTradeName] = useState(initialCompany?.tradeName || "");
  const [name, setName] = useState(initialCompany?.name || "");
  const [cnpj, setCnpj] = useState(initialCompany?.cnpj || "");
  const [domain, setDomain] = useState(initialCompany?.domain || "");
  const [autoDomainApproval, setAutoDomainApproval] = useState(
    initialCompany?.autoDomainApproval ?? true
  );
  const [logoUrl, setLogoUrl] = useState(initialCompany?.logoUrl || "");

  // 2. Gestor
  const [managerName, setManagerName] = useState(initialCompany?.managerName || "");
  const [managerEmail, setManagerEmail] = useState(initialCompany?.managerEmail || "");
  const [managerPhone, setManagerPhone] = useState(initialCompany?.managerPhone || "");

  // 3. Contrato
  const [seatsTotal, setSeatsTotal] = useState<number>(initialCompany?.seatsTotal || 25);
  const [planType, setPlanType] = useState<CompanyPlanType>(initialCompany?.planType || "anual");
  const [status, setStatus] = useState<CompanyStatus>(initialCompany?.status || "ativo");
  const [contractValue, setContractValue] = useState<number>(
    initialCompany?.contractValue ?? 2900
  );
  const [contractStart, setContractStart] = useState<string>(
    initialCompany?.contractStart || new Date().toISOString().slice(0, 10)
  );
  const [contractEnd, setContractEnd] = useState<string>(
    initialCompany?.contractEnd ||
      new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  );

  // 4. Departamentos
  const [departments, setDepartments] = useState<string[]>(
    initialCompany?.departments && initialCompany.departments.length > 0
      ? initialCompany.departments
      : DEFAULT_DEPARTMENTS
  );
  const [newDepartment, setNewDepartment] = useState("");

  // 5. Cursos
  const [selectedCourses, setSelectedCourses] = useState<string[]>(
    initialCompany?.allowedCourseIds || availableCourses.map((c) => c.id)
  );
  const [courseSearch, setCourseSearch] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formatação rápida de CNPJ
  const handleCnpjChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    let formatted = digits;
    if (digits.length > 12) {
      formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/, "$1.$2.$3/$4-$5");
    } else if (digits.length > 8) {
      formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, "$1.$2.$3/$4");
    } else if (digits.length > 5) {
      formatted = digits.replace(/^(\d{2})(\d{3})(\d{1,3})$/, "$1.$2");
    } else if (digits.length > 2) {
      formatted = digits.replace(/^(\d{2})(\d{1,3})$/, "$1.$2");
    }
    setCnpj(formatted);
  };

  // Departamentos
  const handleAddDepartment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newDepartment.trim();
    if (!clean) return;
    if (!departments.includes(clean)) {
      setDepartments([...departments, clean]);
    }
    setNewDepartment("");
  };

  const handleRemoveDepartment = (deptToRemove: string) => {
    setDepartments(departments.filter((d) => d !== deptToRemove));
  };

  // Cursos
  const toggleCourse = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter((id) => id !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };

  const handleSelectAllCourses = () => {
    if (selectedCourses.length === availableCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(availableCourses.map((c) => c.id));
    }
  };

  // Métricas calculadas
  const pricePerSeat =
    seatsTotal > 0 && contractValue > 0
      ? (contractValue / seatsTotal).toFixed(2)
      : "0.00";

  const filteredCourses = availableCourses.filter((course) => {
    const q = courseSearch.toLowerCase();
    return (
      course.title.toLowerCase().includes(q) ||
      course.category.toLowerCase().includes(q) ||
      (course.description || "").toLowerCase().includes(q)
    );
  });

  const getInitials = (nameStr: string) => {
    if (!nameStr.trim()) return "EM";
    return nameStr
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tradeName.trim()) {
      toast.error("Informe o Nome Fantasia da empresa.");
      return;
    }
    if (!name.trim()) {
      toast.error("Informe a Razão Social da empresa.");
      return;
    }
    if (!cnpj.trim()) {
      toast.error("Informe o CNPJ da empresa.");
      return;
    }
    if (!managerName.trim() || !managerEmail.trim()) {
      toast.error("Informe o Nome e E-mail do gestor responsável.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await saveCompany({
        id: initialCompany?.id,
        name: name.trim(),
        tradeName: tradeName.trim(),
        cnpj: cnpj.trim(),
        domain: domain.trim().toLowerCase().replace(/^@/, ""),
        autoDomainApproval,
        logoUrl: logoUrl.trim(),
        managerName: managerName.trim(),
        managerEmail: managerEmail.trim().toLowerCase(),
        managerPhone: managerPhone.trim(),
        seatsTotal: Number(seatsTotal) || 10,
        planType,
        status,
        contractStart,
        contractEnd,
        contractValue: Number(contractValue) || 0,
        allowedCourseIds: selectedCourses,
        departments: departments.length > 0 ? departments : ["Geral"],
      });

      if (!res.success) {
        toast.error(res.message || "Erro ao salvar empresa.");
        return;
      }

      toast.success(
        isEditing
          ? `Empresa atualizada com sucesso!`
          : `Empresa criada com sucesso!`
      );

      router.push("/admin/business");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-16">
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-separator pb-6">
        <div>
          <Link
            href="/admin/business"
            className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Voltar para Empresas & B2B
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
              <Building2 className="size-5" />
            </span>
            {isEditing ? `Editar Empresa: ${tradeName || "Corporativo"}` : "Nova Empresa Corporativa"}
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            Configure todos os dados cadastrais, ponto de contato RH, limites de licenças,
            departamentos e cursos liberados para a organização parceira.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/business"
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
          >
            Cancelar
          </Link>
          <Button
            type="submit"
            variant="primary"
            className="gap-2 shadow-sm font-semibold"
            isDisabled={isSubmitting}
          >
            <Save className="size-4" />
            {isSubmitting
              ? "Salvando..."
              : isEditing
              ? "Salvar Alterações"
              : "Cadastrar Empresa"}
          </Button>
        </div>
      </div>

      {/* GRID PRINCIPAL: 2 COLUNAS (FORMULÁRIO CONTÍNUO + PREVIEW LATERAL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUNA ESQUERDA (FORMULÁRIO PRINCIPAL COM SEÇÕES ORGANIZADAS - SEM ABAS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SEÇÃO 1: IDENTIFICAÇÃO CORPORATIVA */}
          <Card className="overflow-hidden border border-border">
            <Card.Header className="flex items-center gap-3 border-b border-separator/60 bg-surface-secondary/20 px-6 py-4">
              <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground text-xs font-bold">
                1
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Identificação Corporativa & Branding</h2>
                <p className="text-xs text-muted">
                  Dados cadastrais da empresa parceira e domínio oficial para acesso.
                </p>
              </div>
            </Card.Header>

            <Card.Content className="p-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Nome Fantasia <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: TechCorp"
                    required
                    className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <span className="text-[11px] text-muted mt-1 block">
                    Nome visível nos relatórios e para os colaboradores.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Razão Social <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: TechCorp Soluções Digitais Ltda"
                    required
                    className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    CNPJ <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    required
                    maxLength={18}
                    className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-sm font-mono text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Domínio de E-mail Corporativo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-mono">
                      @
                    </span>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value.replace(/^@/, ""))}
                      placeholder="empresa.com.br"
                      className="w-full h-10 rounded-xl border border-border bg-surface pl-8 pr-3 text-sm font-mono text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <span className="text-[11px] text-muted mt-1 block">
                    Ex: techcorp.io (sem @ ou https).
                  </span>
                </div>
              </div>

              {/* AUTO ADMISSÃO */}
              <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-4 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDomainApproval}
                    onChange={(e) => setAutoDomainApproval(e.target.checked)}
                    className="mt-1 size-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-accent" />
                      Auto-admissão de colaboradores pelo domínio corporativo
                    </span>
                    <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                      Quando ativado, qualquer colaborador que criar uma conta ou fizer login com o e-mail{" "}
                      <span className="font-mono text-accent font-semibold">
                        @{domain || "dominio.com"}
                      </span>{" "}
                      será automaticamente vinculado a esta empresa e consumirá 1 vaga do contrato, sem necessidade de convite manual.
                    </p>
                  </div>
                </label>
              </div>

              {/* LOGO */}
              <ImageUpload
                label="Logotipo da Empresa (Opcional)"
                value={logoUrl}
                onChange={(url) => setLogoUrl(url ?? "")}
                folder="companies"
                aspect="square"
                description="Quadrado, no mínimo 256x256px."
              />
            </Card.Content>
          </Card>

          {/* SEÇÃO 2: GESTOR DE RH E CONTATO */}
          <Card className="overflow-hidden border border-border">
            <Card.Header className="flex items-center gap-3 border-b border-separator/60 bg-surface-secondary/20 px-6 py-4">
              <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground text-xs font-bold">
                2
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Gestor de RH & Treinamento Responsável</h2>
                <p className="text-xs text-muted">
                  Contato principal que terá acesso ao Portal Corporativo de Gestão da Empresa.
                </p>
              </div>
            </Card.Header>

            <Card.Content className="p-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Nome Completo do Gestor <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                    <input
                      type="text"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Ex: Carla Albuquerque"
                      required
                      className="w-full h-10 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    E-mail Corporativo do Gestor <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                    <input
                      type="email"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="gestor@empresa.com"
                      required
                      className="w-full h-10 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <span className="text-[11px] text-accent font-medium mt-1 block">
                    Utilizado para login em /empresa/gestao
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                    <input
                      type="tel"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full h-10 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* SEÇÃO 3: CONTRATO, VAGAS E FATURAMENTO */}
          <Card className="overflow-hidden border border-border">
            <Card.Header className="flex items-center gap-3 border-b border-separator/60 bg-surface-secondary/20 px-6 py-4">
              <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground text-xs font-bold">
                3
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Contrato, Limite de Vagas e Faturamento</h2>
                <p className="text-xs text-muted">
                  Defina a capacidade de colaboradores, modelo de cobrança e vigência do contrato.
                </p>
              </div>
            </Card.Header>

            <Card.Content className="p-6 space-y-6">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* VAGAS TOTAIS */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Total de Vagas/Licenças <span className="text-danger">*</span>
                    </label>
                    <span className="text-[11px] text-muted">Capacidade máxima</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={seatsTotal}
                    onChange={(e) => setSeatsTotal(parseInt(e.target.value) || 1)}
                    required
                    className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />

                  {/* PRESETS RÁPIDOS */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-muted font-medium mr-1">Presets:</span>
                    {[10, 25, 50, 100, 250].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSeatsTotal(count)}
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                          seatsTotal === count
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border bg-surface text-muted hover:text-foreground"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PLANO */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Modelo do Plano
                  </label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as CompanyPlanType)}
                    className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="anual">Anual (12 Meses)</option>
                    <option value="mensal">Mensal Recorrente</option>
                    <option value="corporativo_custom">Customizado / Enterprise</option>
                  </select>
                </div>

                {/* STATUS */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Status do Contrato
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CompanyStatus)}
                    className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="trial">Trial / Degustação</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-3 pt-2 border-t border-separator/60">
                {/* VALOR */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Valor Mensal Contratado (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                      R$
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={contractValue}
                      onChange={(e) => setContractValue(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <span className="text-[11px] text-muted mt-1 block">
                    Aprox. R$ {pricePerSeat} / vaga / mês
                  </span>
                </div>

                {/* DATA INICIO */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Início da Vigência
                  </label>
                  <input
                    type="date"
                    value={contractStart}
                    onChange={(e) => setContractStart(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* DATA FIM */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Término da Vigência
                  </label>
                  <input
                    type="date"
                    value={contractEnd}
                    onChange={(e) => setContractEnd(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* SEÇÃO 4: DEPARTAMENTOS E ESTRUTURA */}
          <Card className="overflow-hidden border border-border">
            <Card.Header className="flex items-center gap-3 border-b border-separator/60 bg-surface-secondary/20 px-6 py-4">
              <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground text-xs font-bold">
                4
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Departamentos & Estrutura Organizacional</h2>
                <p className="text-xs text-muted">
                  Defina os setores iniciais para segmentação e distribuição de trilhas na empresa.
                </p>
              </div>
            </Card.Header>

            <Card.Content className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                {departments.map((dept) => (
                  <span
                    key={dept}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-foreground border border-border"
                  >
                    <Tag className="size-3 text-accent" />
                    {dept}
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(dept)}
                      className="ml-1 text-muted hover:text-danger rounded p-0.5"
                      title={`Remover departamento ${dept}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 max-w-md pt-2">
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDepartment();
                    }
                  }}
                  placeholder="Novo departamento (ex: Jurídico, T&D)"
                  className="flex-1 h-9 rounded-xl border border-border bg-surface px-3 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onPress={() => handleAddDepartment()}
                  className="text-xs gap-1"
                >
                  <Plus className="size-3.5" /> Adicionar
                </Button>
              </div>
            </Card.Content>
          </Card>

          {/* SEÇÃO 5: CURSOS LIBERADOS */}
          <Card className="overflow-hidden border border-border">
            <Card.Header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-separator/60 bg-surface-secondary/20 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground text-xs font-bold">
                  5
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Cursos Liberados no Pacote ({selectedCourses.length} de {availableCourses.length})
                  </h2>
                  <p className="text-xs text-muted">
                    Selecione quais conteúdos do catálogo ficarão disponíveis para esta organização.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold shrink-0"
                onPress={handleSelectAllCourses}
              >
                {selectedCourses.length === availableCourses.length
                  ? "Desmarcar Todos"
                  : "Liberar Catálogo Completo"}
              </Button>
            </Card.Header>

            <Card.Content className="p-6 space-y-4">
              {/* BUSCA RÁPIDA DE CURSOS */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Buscar curso por título ou categoria..."
                  className="w-full h-9 rounded-xl border border-border bg-surface pl-9 pr-3 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* GRID DE CURSOS VISUAIS */}
              <div className="grid gap-3 sm:grid-cols-2 max-h-[460px] overflow-y-auto p-1 pr-2">
                {filteredCourses.map((course) => {
                  const isSelected = selectedCourses.includes(course.id);
                  return (
                    <div
                      key={course.id}
                      onClick={() => toggleCourse(course.id)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none text-left",
                        isSelected
                          ? "border-accent bg-accent-soft/30 shadow-xs"
                          : "border-border bg-surface hover:bg-surface-secondary/50 opacity-75"
                      )}
                    >
                      {/* THUMBNAIL */}
                      <div className="relative size-14 shrink-0 rounded-lg overflow-hidden border border-border bg-surface-secondary">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={course.cover}
                          alt={course.title}
                          className="size-full object-cover"
                        />
                      </div>

                      {/* DETALHES */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                            {course.category}
                          </span>
                          <span
                            className={cn(
                              "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                              isSelected
                                ? "bg-accent border-accent text-accent-foreground"
                                : "border-border bg-surface"
                            )}
                          >
                            {isSelected && <Check className="size-3" />}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground truncate mt-0.5">
                          {course.title}
                        </h4>
                        <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
                          {course.duration} · {course.lessonCount} aulas
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* COLUNA DIREITA: CARD DE RESUMO FIXO / LIVE PREVIEW */}
        <div className="lg:col-span-4 sticky top-6 space-y-6">
          <Card className="border border-border shadow-sm overflow-hidden">
            <Card.Header className="bg-surface-secondary/40 border-b border-separator px-5 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Resumo da Conta B2B
                </h3>
              </div>
            </Card.Header>

            <Card.Content className="p-5 space-y-5">
              {/* BRANDING PREVIEW */}
              <div className="flex items-center gap-3 pb-4 border-b border-separator">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-secondary flex items-center justify-center font-bold text-sm text-accent">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={tradeName}
                      className="size-full object-cover"
                    />
                  ) : (
                    getInitials(tradeName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-foreground truncate">
                    {tradeName || "Nome da Empresa"}
                  </h4>
                  <p className="text-xs text-muted font-mono truncate">
                    {cnpj || "00.000.000/0001-00"}
                  </p>
                  {domain && (
                    <span className="text-[10px] text-accent font-mono block">
                      @{domain}
                    </span>
                  )}
                </div>
                <StatusBadge
                  tone={
                    status === "ativo"
                      ? "positive"
                      : status === "trial"
                      ? "primary"
                      : "neutral"
                  }
                >
                  {status}
                </StatusBadge>
              </div>

              {/* MÉTRICAS CHAVE */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-border bg-surface-secondary/30 p-3">
                  <span className="text-muted block text-[11px]">Vagas Totais</span>
                  <strong className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <Users className="size-4 text-accent" />
                    {seatsTotal} licenças
                  </strong>
                </div>

                <div className="rounded-xl border border-border bg-surface-secondary/30 p-3">
                  <span className="text-muted block text-[11px]">Cursos Liberados</span>
                  <strong className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="size-4 text-success" />
                    {selectedCourses.length} de {availableCourses.length}
                  </strong>
                </div>

                <div className="rounded-xl border border-border bg-surface-secondary/30 p-3 col-span-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-muted block text-[11px]">Faturamento Recorrente</span>
                      <strong className="text-base font-bold text-foreground block mt-0.5">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(contractValue)}
                        <span className="text-xs font-normal text-muted">/mês</span>
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted uppercase tracking-wider block">Plano</span>
                      <span className="text-xs font-semibold capitalize text-foreground">
                        {planType.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GESTOR RESPONSÁVEL */}
              <div className="rounded-xl border border-border/80 bg-surface-secondary/20 p-3 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Gestor Responsável
                </span>
                <p className="font-semibold text-foreground">
                  {managerName || "Não informado"}
                </p>
                <p className="text-muted text-[11px] truncate">
                  {managerEmail || "gestor@empresa.com"}
                </p>
              </div>

              {/* BOTÕES DE SUBMIT */}
              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full gap-2 font-semibold h-11 shadow-sm"
                  isDisabled={isSubmitting}
                >
                  <Save className="size-4" />
                  {isSubmitting
                    ? "Salvando..."
                    : isEditing
                    ? "Salvar Alterações"
                    : "Cadastrar Empresa"}
                </Button>

                <Link
                  href="/admin/business"
                  className="block text-center rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
                >
                  Cancelar e Voltar
                </Link>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </form>
  );
}
