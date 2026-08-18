"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Modal,
  TextField,
} from "@heroui/react";
import { Building2, Check } from "lucide-react";
import { Company, CompanyPlanType, CompanyStatus } from "@/types/business";
import { saveCompany } from "@/lib/businessStorage";
import { CATALOG_COURSES } from "@/lib/catalog";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCompany?: Company | null;
  onSuccess: () => void;
}

export function CompanyModal({
  isOpen,
  onClose,
  initialCompany,
  onSuccess,
}: CompanyModalProps) {
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [domain, setDomain] = useState("");
  const [autoDomainApproval, setAutoDomainApproval] = useState(true);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [seatsTotal, setSeatsTotal] = useState<number>(20);
  const [planType, setPlanType] = useState<CompanyPlanType>("anual");
  const [status, setStatus] = useState<CompanyStatus>("ativo");
  const [contractValue, setContractValue] = useState<number>(2900);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(
    CATALOG_COURSES.map((c) => c.id)
  );
  const [logoUrl, setLogoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialCompany) {
      setName(initialCompany.name);
      setTradeName(initialCompany.tradeName);
      setCnpj(initialCompany.cnpj);
      setDomain(initialCompany.domain || "");
      setAutoDomainApproval(initialCompany.autoDomainApproval ?? true);
      setManagerName(initialCompany.managerName);
      setManagerEmail(initialCompany.managerEmail);
      setManagerPhone(initialCompany.managerPhone || "");
      setSeatsTotal(initialCompany.seatsTotal);
      setPlanType(initialCompany.planType);
      setStatus(initialCompany.status);
      setContractValue(initialCompany.contractValue);
      setSelectedCourses(initialCompany.allowedCourseIds || CATALOG_COURSES.map((c) => c.id));
      setLogoUrl(initialCompany.logoUrl || "");
    } else {
      setName("");
      setTradeName("");
      setCnpj("");
      setDomain("");
      setAutoDomainApproval(true);
      setManagerName("");
      setManagerEmail("");
      setManagerPhone("");
      setSeatsTotal(20);
      setPlanType("anual");
      setStatus("ativo");
      setContractValue(2900);
      setSelectedCourses(CATALOG_COURSES.map((c) => c.id));
      setLogoUrl("");
    }
  }, [initialCompany, isOpen]);

  const toggleCourse = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter((id) => id !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };

  const handleSelectAllCourses = () => {
    if (selectedCourses.length === CATALOG_COURSES.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(CATALOG_COURSES.map((c) => c.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tradeName.trim() || !cnpj.trim()) {
      toast.error("Preencha Razão Social, Nome Fantasia e CNPJ.");
      return;
    }

    if (!managerName.trim() || !managerEmail.trim()) {
      toast.error("Preencha os dados do gestor responsável.");
      return;
    }

    setIsSubmitting(true);

    saveCompany({
      id: initialCompany?.id,
      name: name.trim(),
      tradeName: tradeName.trim(),
      cnpj: cnpj.trim(),
      domain: domain.trim(),
      autoDomainApproval,
      managerName: managerName.trim(),
      managerEmail: managerEmail.trim(),
      managerPhone: managerPhone.trim(),
      seatsTotal: Number(seatsTotal) || 10,
      planType,
      status,
      contractValue: Number(contractValue) || 0,
      allowedCourseIds: selectedCourses,
      logoUrl: logoUrl.trim(),
    });

    setIsSubmitting(false);
    toast.success(initialCompany ? "Empresa atualizada com sucesso!" : "Nova empresa cadastrada com sucesso!");
    onSuccess();
    onClose();
  };

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <Building2 className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Modal.Heading>{initialCompany ? "Editar Empresa" : "Cadastrar Nova Empresa (B2B)"}</Modal.Heading>
                    <p className="text-xs text-muted">
                      Defina os dados corporativos, limites de licenças/vagas e cursos liberados.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-6">
                {/* 1. DADOS DA EMPRESA */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    1. Identificação Corporativa
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField value={tradeName} onChange={setTradeName} isRequired>
                      <Label>Nome Fantasia</Label>
                      <Input placeholder="Ex: TechCorp" autoFocus />
                    </TextField>

                    <TextField value={name} onChange={setName} isRequired>
                      <Label>Razão Social</Label>
                      <Input placeholder="Ex: TechCorp Soluções Digitais Ltda" />
                    </TextField>

                    <TextField value={cnpj} onChange={setCnpj} isRequired>
                      <Label>CNPJ</Label>
                      <Input placeholder="00.000.000/0001-00" />
                    </TextField>

                    <TextField value={domain} onChange={setDomain}>
                      <Label>Domínio Corporativo (para auto-admissão)</Label>
                      <Input placeholder="empresa.com.br" />
                    </TextField>
                  </div>

                  <div className="mt-4">
                    <ImageUpload
                      label="Logotipo da Empresa (Opcional)"
                      value={logoUrl}
                      onChange={(url) => setLogoUrl(url ?? "")}
                      folder="companies"
                      aspect="square"
                      description="Quadrado, no mínimo 256x256px."
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoApproval"
                      checked={autoDomainApproval}
                      onChange={(e) => setAutoDomainApproval(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    <label htmlFor="autoApproval" className="text-xs text-foreground font-medium cursor-pointer">
                      Permitir auto-cadastro de colaboradores com o e-mail deste domínio
                    </label>
                  </div>
                </div>

                {/* 2. DADOS DO GESTOR RESPONSÁVEL */}
                <div className="pt-2 border-t border-separator">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    2. Gestor de RH / Treinamento Responsável
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <TextField value={managerName} onChange={setManagerName} isRequired>
                      <Label>Nome do Gestor</Label>
                      <Input placeholder="Ex: Carla Albuquerque" />
                    </TextField>

                    <TextField value={managerEmail} onChange={setManagerEmail} isRequired>
                      <Label>E-mail do Gestor</Label>
                      <Input type="email" placeholder="gestor@empresa.com" />
                    </TextField>

                    <TextField value={managerPhone} onChange={setManagerPhone}>
                      <Label>Telefone / WhatsApp</Label>
                      <Input placeholder="(11) 99999-9999" />
                    </TextField>
                  </div>
                </div>

                {/* 3. CONTRATO, VAGAS E FATURAMENTO */}
                <div className="pt-2 border-t border-separator">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    3. Contrato, Limite de Vagas e Valores
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Total de Vagas/Licenças
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10000}
                        value={seatsTotal}
                        onChange={(e) => setSeatsTotal(parseInt(e.target.value) || 1)}
                        className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Modelo do Plano
                      </label>
                      <select
                        value={planType}
                        onChange={(e) => setPlanType(e.target.value as CompanyPlanType)}
                        className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="anual">Anual</option>
                        <option value="mensal">Mensal</option>
                        <option value="corporativo_custom">Customizado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Status do Contrato
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as CompanyStatus)}
                        className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                        <option value="suspenso">Suspenso</option>
                        <option value="trial">Trial / Degustação</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Valor Mensal (R$)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={contractValue}
                        onChange={(e) => setContractValue(parseFloat(e.target.value) || 0)}
                        className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. CURSOS LIBERADOS */}
                <div className="pt-2 border-t border-separator">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                      4. Cursos Liberados ({selectedCourses.length} de {CATALOG_COURSES.length})
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onPress={handleSelectAllCourses}
                    >
                      {selectedCourses.length === CATALOG_COURSES.length ? "Desmarcar todos" : "Liberar catálogo completo"}
                    </Button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border bg-surface p-2">
                    {CATALOG_COURSES.map((course) => {
                      const isSelected = selectedCourses.includes(course.id);
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => toggleCourse(course.id)}
                          className={`flex w-full items-center justify-between p-2 rounded-md text-left text-xs transition-colors ${
                            isSelected
                              ? "bg-accent-soft/60 text-foreground font-semibold"
                              : "hover:bg-surface-secondary text-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span
                              className={`grid size-4 shrink-0 place-items-center rounded border ${
                                isSelected
                                  ? "bg-accent border-accent text-accent-foreground"
                                  : "border-border bg-surface"
                              }`}
                            >
                              {isSelected && <Check className="size-3" />}
                            </span>
                            <span className="truncate">{course.title}</span>
                          </div>
                          <span className="text-[10px] text-muted shrink-0">{course.category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button type="button" variant="tertiary" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isDisabled={isSubmitting}>
                  <Building2 className="size-4 mr-1.5" />
                  {initialCompany ? "Salvar Alterações" : "Criar Conta Corporativa"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
