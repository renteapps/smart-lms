"use client";

import React, { useState } from "react";
import {
  Button,
  Input,
  Label,
  Modal,
  TextField,
} from "@heroui/react";
import { UserPlus, Mail, Building2, Check, AlertCircle } from "lucide-react";
import { Company, MemberRole } from "@/types/business";
import { inviteMember } from "@/app/actions/admin/platform";
import { toast } from "sonner";
import { CatalogCourse } from "@/types/course";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onSuccess: () => void;
  availableSeats: number;
  availableCourses?: CatalogCourse[];
}

export function InviteMemberModal({
  isOpen,
  onClose,
  company,
  onSuccess,
  availableSeats,
  availableCourses = [],
}: InviteMemberModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState(company.departments[0] || "Geral");
  const [customDepartment, setCustomDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [roleInCompany, setRoleInCompany] = useState<MemberRole>("colaborador");
  const [selectedCourses, setSelectedCourses] = useState<string[]>(
    company.allowedCourseIds.slice(0, 2)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyCourses = availableCourses.filter((c) =>
    company.allowedCourseIds.includes(c.id)
  );

  const toggleCourse = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter((id) => id !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Preencha o nome e o e-mail do colaborador.");
      return;
    }

    if (availableSeats <= 0) {
      toast.error("Limite de vagas atingido. Solicite expansão de vagas antes de convidar.");
      return;
    }

    setIsSubmitting(true);
    const finalDepartment = department === "outro" ? (customDepartment.trim() || "Geral") : department;

    const res = await inviteMember(company.id, {
      name: name.trim(),
      email: email.trim(),
      department: finalDepartment,
      jobTitle: jobTitle.trim(),
      role: roleInCompany,
    });
    // @todo Assign courses after invite member if assignedCourseIds was used (now inviteMember only invites)
    // we should create a new server action or do it inside inviteMember.
    
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Convite enviado com sucesso para ${email.trim()}!`);
      setName("");
      setEmail("");
      setJobTitle("");
      onSuccess();
      onClose();
    } else {
      toast.error(res.message || "Erro ao convidar colaborador.");
    }
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
                    <UserPlus className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Modal.Heading>Convidar Colaborador</Modal.Heading>
                    <p className="text-xs text-muted">
                      Envie um convite de acesso para um membro da sua equipe.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-5">
                {/* Indicador de vagas restantes */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary/50 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-accent" />
                    <span className="font-semibold text-foreground">{company.tradeName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    {availableSeats > 0 ? (
                      <span className="text-success-foreground bg-success-soft px-2 py-0.5 rounded-md font-semibold">
                        {availableSeats} {availableSeats === 1 ? "vaga disponível" : "vagas disponíveis"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-danger font-semibold bg-danger-soft px-2 py-0.5 rounded-md">
                        <AlertCircle className="size-3.5" /> 0 vagas restantes
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField value={name} onChange={setName} isRequired>
                    <Label>Nome Completo</Label>
                    <Input placeholder="Ex: Mariana Silva" autoFocus />
                  </TextField>

                  <TextField value={email} onChange={setEmail} isRequired>
                    <Label>E-mail Corporativo</Label>
                    <Input type="email" placeholder={`nome@${company.domain || "empresa.com"}`} />
                  </TextField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Departamento / Setor
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {company.departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                      <option value="outro">+ Outro departamento...</option>
                    </select>
                  </div>

                  <TextField value={jobTitle} onChange={setJobTitle}>
                    <Label>Cargo / Função (opcional)</Label>
                    <Input placeholder="Ex: Analista de Dados Pleno" />
                  </TextField>
                </div>

                {department === "outro" && (
                  <TextField value={customDepartment} onChange={setCustomDepartment} isRequired>
                    <Label>Nome do Novo Departamento</Label>
                    <Input placeholder="Ex: Novos Negócios" />
                  </TextField>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Papel na Organização
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: "colaborador" as MemberRole, title: "Colaborador", desc: "Acesso aos cursos" },
                      { role: "lider_equipe" as MemberRole, title: "Líder de Equipe", desc: "Acompanha setor" },
                      { role: "gestor" as MemberRole, title: "Gestor RH", desc: "Gerencia vagas" },
                    ].map((item) => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setRoleInCompany(item.role)}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                          roleInCompany === item.role
                            ? "border-accent bg-accent-soft text-accent-soft-foreground ring-1 ring-accent"
                            : "border-border bg-surface hover:bg-surface-secondary text-foreground"
                        }`}
                      >
                        <span className="block font-semibold">{item.title}</span>
                        <span className="block text-[10px] text-muted">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cursos Iniciais Atribuídos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold text-foreground">
                      Cursos Inicialmente Atribuídos ({selectedCourses.length} selecionados)
                    </Label>
                    <span className="text-[11px] text-muted">
                      Colaborador também poderá navegar no catálogo liberado
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2 bg-surface">
                    {companyCourses.map((course) => {
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
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={availableSeats <= 0 || !name.trim() || !email.trim() || isSubmitting}
                >
                  <Mail className="size-4 mr-1.5" />
                  Enviar Convite
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
