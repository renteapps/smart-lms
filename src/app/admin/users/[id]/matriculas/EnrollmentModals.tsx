"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Modal,
  SearchField,
  Label,
  Input,
} from "@heroui/react";
import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  Infinity as InfinityIcon,
  Sparkles,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  createEnrollment,
  updateEnrollmentExpiration,
  deleteEnrollment,
} from "@/app/actions/admin/enrollments";
import { calculateExpiresAt, type ExpirationOption } from "@/lib/enrollmentUtils";

export interface AvailableCourse {
  id: string;
  title: string;
  category: string;
  coverUrl?: string;
  duration?: string;
}

export interface EnrollmentItem {
  id: string;
  enrollmentId: string;
  courseId: string;
  courseName: string;
  category: string;
  progress: string;
  rawProgress: number;
  status: string;
  rawStatus?: string;
  statusTone: "positive" | "primary" | "neutral" | "negative";
  enrolledAt: string;
  expiresAt: string | null;
  expirationLabel: string;
  isExpired: boolean;
}

// ---------------------------------------------------------------------------
// Modal: Criar Nova Matrícula
// ---------------------------------------------------------------------------

interface CreateEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  availableCourses: AvailableCourse[];
  existingCourseIds: string[];
  onSuccess: (created?: {
    enrollmentData: { id: string; user_id: string; course_id: string; enrolled_at: string; expires_at: string | null; status: string };
    course: AvailableCourse;
    expiresAt: string | null;
  }) => void;
}

export function CreateEnrollmentModal({
  isOpen,
  onClose,
  userId,
  userName,
  availableCourses,
  existingCourseIds,
  onSuccess,
}: CreateEnrollmentModalProps) {
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [expirationType, setExpirationType] = useState<ExpirationOption>("indefinite");
  const [customDate, setCustomDate] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define uma data padrão para o campo customizado (30 dias à frente)
  useEffect(() => {
    if (!customDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setCustomDate(defaultDate.toISOString().split("T")[0]);
    }
  }, [customDate]);

  // Limpa estados ao fechar/abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedCourseId("");
      setExpirationType("indefinite");
      setSearch("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const filteredCourses = availableCourses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  // Calcula prévia da data de expiração
  let previewDateText = "";
  try {
    const calculatedIso = calculateExpiresAt(expirationType, customDate);
    if (!calculatedIso) {
      previewDateText = "Acesso Vitalício / Indeterminado (sem prazo de expiração)";
    } else {
      const dateObj = new Date(calculatedIso);
      previewDateText = `Acesso válido até ${dateObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`;
    }
  } catch {
    previewDateText = "Data inválida selecionada";
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!selectedCourseId) {
      toast.error("Selecione um curso para realizar a matrícula.");
      return;
    }

    if (expirationType === "custom" && !customDate) {
      toast.error("Informe a data limite de acesso.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createEnrollment({
        userId,
        courseId: selectedCourseId,
        expirationType,
        customDate: expirationType === "custom" ? customDate : null,
      });

      if (res.success) {
        toast.success(`Matrícula criada com sucesso para ${userName}!`);
        const course = availableCourses.find((c) => c.id === selectedCourseId);
        const calculatedExpiresAt = calculateExpiresAt(expirationType, customDate);
        if (course && res.data) {
          onSuccess({
            enrollmentData: res.data as { id: string; user_id: string; course_id: string; enrolled_at: string; expires_at: string | null; status: string },
            course,
            expiresAt: calculatedExpiresAt,
          });
        } else {
          onSuccess();
        }
        router.refresh();
        onClose();
      } else {
        toast.error(res.message || "Erro ao criar matrícula.");
      }
    } catch {
      toast.error("Ocorreu um erro inesperado ao salvar a matrícula.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourse = availableCourses.find((c) => c.id === selectedCourseId);

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog className="max-w-2xl sm:w-[42rem]">
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <BookOpen className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Modal.Heading className="text-lg font-bold">Nova Matrícula</Modal.Heading>
                    <p className="text-xs text-muted">
                      Matricule <strong>{userName}</strong> em um curso e defina o tempo de acesso.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-6 py-4">
                {/* 1. Seleção de Curso */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    1. Selecione o Curso
                  </Label>

                  <SearchField
                    value={search}
                    onChange={setSearch}
                    className="w-full"
                    aria-label="Buscar curso por nome ou categoria"
                  >
                    <Label className="sr-only">Buscar curso</Label>
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Buscar por título ou categoria..." />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-xl border border-border bg-surface p-2">
                    {filteredCourses.map((course) => {
                      const isSelected = selectedCourseId === course.id;
                      const isAlreadyEnrolled = existingCourseIds.includes(course.id);

                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => setSelectedCourseId(course.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "border-accent bg-accent-soft/40 shadow-xs"
                              : "border-border/60 hover:border-border bg-surface hover:bg-surface-secondary/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <span
                              className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                                isSelected
                                  ? "bg-accent border-accent text-accent-foreground"
                                  : "border-border bg-surface"
                              }`}
                            >
                              {isSelected && <Check className="size-3" />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {course.title}
                              </p>
                              <p className="text-xs text-muted truncate">
                                {course.category}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isAlreadyEnrolled && (
                              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
                                Já matriculado
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {filteredCourses.length === 0 && (
                      <div className="py-6 text-center text-xs text-muted">
                        Nenhum curso encontrado com o termo buscado.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Duração / Vigência */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    2. Vigência / Prazo de Acesso
                  </Label>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {/* Vitalício / Indeterminado */}
                    <button
                      type="button"
                      onClick={() => setExpirationType("indefinite")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "indefinite"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <InfinityIcon className="size-4 text-accent" />
                        Indeterminado
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">Acesso vitalício</span>
                    </button>

                    {/* 30 dias */}
                    <button
                      type="button"
                      onClick={() => setExpirationType("30d")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "30d"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Clock className="size-3.5 text-accent" />
                        30 dias
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">1 mês de acesso</span>
                    </button>

                    {/* 90 dias */}
                    <button
                      type="button"
                      onClick={() => setExpirationType("90d")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "90d"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Clock className="size-3.5 text-accent" />
                        90 dias
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">3 meses de acesso</span>
                    </button>

                    {/* 180 dias */}
                    <button
                      type="button"
                      onClick={() => setExpirationType("180d")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "180d"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Clock className="size-3.5 text-accent" />
                        180 dias
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">6 meses de acesso</span>
                    </button>

                    {/* 365 dias */}
                    <button
                      type="button"
                      onClick={() => setExpirationType("365d")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "365d"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Clock className="size-3.5 text-accent" />
                        365 dias
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">1 ano de acesso</span>
                    </button>

                    {/* Personalizado */}
                    <button
                      type="button"
                      onClick={() => setExpirationType("custom")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "custom"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Calendar className="size-3.5 text-accent" />
                        Personalizado
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">Escolher data limite</span>
                    </button>
                  </div>

                  {/* Campo de Data Personalizada */}
                  {expirationType === "custom" && (
                    <div className="pt-2">
                      <Label htmlFor="customDateInput" className="text-xs text-foreground mb-1 block">
                        Data de término do acesso:
                      </Label>
                      <Input
                        id="customDateInput"
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full sm:w-64"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  )}
                </div>

                {/* Banner de resumo / feedback */}
                <div className="rounded-xl border border-accent/30 bg-accent-soft/30 p-3.5 flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground text-xs">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="min-w-0 text-xs">
                    <p className="font-semibold text-foreground">
                      {selectedCourse ? selectedCourse.title : "Nenhum curso selecionado"}
                    </p>
                    <p className="text-muted mt-0.5">{previewDateText}</p>
                  </div>
                </div>
              </Modal.Body>

              <Modal.Footer className="justify-between">
                <Button type="button" variant="tertiary" onPress={onClose} isDisabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onPress={() => void handleSubmit()}
                  isDisabled={!selectedCourseId || isSubmitting}
                  className="gap-2"
                >
                  <BookOpen className="size-4" />
                  {isSubmitting ? "Matriculando..." : "Confirmar Matrícula"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

// ---------------------------------------------------------------------------
// Modal: Editar Validade da Matrícula
// ---------------------------------------------------------------------------

interface EditEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollment: EnrollmentItem | null;
  userId: string;
  userName: string;
  onSuccess: (enrollmentId: string, expiresAt: string | null, status: string) => void;
}

export function EditEnrollmentModal({
  isOpen,
  onClose,
  enrollment,
  userId,
  userName,
  onSuccess,
}: EditEnrollmentModalProps) {
  const router = useRouter();
  const [expirationType, setExpirationType] = useState<ExpirationOption>("indefinite");
  const [customDate, setCustomDate] = useState<string>("");
  const [status, setStatus] = useState<"active" | "inactive" | "completed">("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (enrollment) {
      if (enrollment.expiresAt) {
        setExpirationType("custom");
        const d = new Date(enrollment.expiresAt);
        setCustomDate(d.toISOString().split("T")[0]);
      } else {
        setExpirationType("indefinite");
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        setCustomDate(defaultDate.toISOString().split("T")[0]);
      }
      setStatus(
        enrollment.rawStatus === "completed" || enrollment.status === "Concluído"
          ? "completed"
          : "active"
      );
      setIsSubmitting(false);
    }
  }, [enrollment, isOpen]);

  if (!enrollment) return null;

  let previewDateText = "";
  try {
    const calculatedIso = calculateExpiresAt(expirationType, customDate);
    if (!calculatedIso) {
      previewDateText = "Acesso Vitalício / Indeterminado (sem prazo de expiração)";
    } else {
      const dateObj = new Date(calculatedIso);
      previewDateText = `Novo vencimento: ${dateObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`;
    }
  } catch {
    previewDateText = "Data inválida selecionada";
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (expirationType === "custom" && !customDate) {
      toast.error("Informe a nova data limite de acesso.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateEnrollmentExpiration({
        enrollmentId: enrollment.enrollmentId || enrollment.id,
        userId,
        expirationType,
        customDate: expirationType === "custom" ? customDate : null,
        status,
      });

      if (res.success) {
        toast.success(`Validade da matrícula de ${enrollment.courseName} atualizada com sucesso!`);
        const calculatedExpiresAt = calculateExpiresAt(expirationType, customDate);
        onSuccess(enrollment.id, calculatedExpiresAt, status);
        router.refresh();
        onClose();
      } else {
        toast.error(res.message || "Erro ao atualizar matrícula.");
      }
    } catch {
      toast.error("Ocorreu um erro ao salvar as alterações.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog className="max-w-2xl sm:w-[42rem]">
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <Calendar className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Modal.Heading className="text-lg font-bold">Editar Validade da Matrícula</Modal.Heading>
                    <p className="text-xs text-muted">
                      Ajuste o prazo de vigência do curso <strong>{enrollment.courseName}</strong> para <strong>{userName}</strong>.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-6 py-4">
                {/* Info do Curso */}
                <div className="rounded-xl border border-border bg-surface-secondary/30 p-3.5">
                  <p className="text-xs text-muted">Curso</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{enrollment.courseName}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                    <span>Matriculado em: <strong>{enrollment.enrolledAt}</strong></span>
                    <span>•</span>
                    <span>Vigência atual: <strong className={enrollment.isExpired ? "text-danger" : ""}>{enrollment.expirationLabel}</strong></span>
                  </div>
                </div>

                {/* Seleção de novo prazo */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Definir Novo Prazo de Vigência
                  </Label>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setExpirationType("indefinite")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "indefinite"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <InfinityIcon className="size-4 text-accent" />
                        Indeterminado
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">Tornar vitalício</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpirationType("30d")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "30d"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Clock className="size-3.5 text-accent" />
                        +30 dias
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">A partir de hoje</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpirationType("90d")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "90d"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Clock className="size-3.5 text-accent" />
                        +90 dias
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">A partir de hoje</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpirationType("180d")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "180d"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Clock className="size-3.5 text-accent" />
                        +180 dias
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">A partir de hoje</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpirationType("365d")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "365d"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Clock className="size-3.5 text-accent" />
                        +365 dias
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">A partir de hoje</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpirationType("custom")}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        expirationType === "custom"
                          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-secondary/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Calendar className="size-3.5 text-accent" />
                        Data específica
                      </span>
                      <span className="text-[11px] text-muted mt-0.5">Definir dia exato</span>
                    </button>
                  </div>

                  {expirationType === "custom" && (
                    <div className="pt-2">
                      <Label htmlFor="editCustomDateInput" className="text-xs text-foreground mb-1 block">
                        Nova data de expiração:
                      </Label>
                      <Input
                        id="editCustomDateInput"
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full sm:w-64"
                      />
                    </div>
                  )}
                </div>

                {/* Banner de resumo */}
                <div className="rounded-xl border border-accent/30 bg-accent-soft/30 p-3.5 flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground text-xs">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="min-w-0 text-xs">
                    <p className="font-semibold text-foreground">{previewDateText}</p>
                    <p className="text-muted mt-0.5">
                      O acesso às aulas e materiais do curso será validado de acordo com esta vigência.
                    </p>
                  </div>
                </div>
              </Modal.Body>

              <Modal.Footer className="justify-between">
                <Button type="button" variant="tertiary" onPress={onClose} isDisabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={isSubmitting}
                  className="gap-2"
                >
                  <Calendar className="size-4" />
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

// ---------------------------------------------------------------------------
// Modal: Confirmar Revogação / Exclusão de Matrícula
// ---------------------------------------------------------------------------

interface DeleteEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollment: EnrollmentItem | null;
  userId: string;
  userName: string;
  onSuccess: (enrollmentId: string) => void;
}

export function DeleteEnrollmentModal({
  isOpen,
  onClose,
  enrollment,
  userId,
  userName,
  onSuccess,
}: DeleteEnrollmentModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!enrollment) return null;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await deleteEnrollment({
        enrollmentId: enrollment.enrollmentId || enrollment.id,
        userId,
        courseId: enrollment.courseId,
      });

      if (res.success) {
        toast.success(`Matrícula no curso "${enrollment.courseName}" revogada com sucesso.`);
        onSuccess(enrollment.id);
        router.refresh();
        onClose();
      } else {
        toast.error(res.message || "Erro ao revogar matrícula.");
      }
    } catch {
      toast.error("Ocorreu um erro ao revogar a matrícula.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <Modal.Heading className="text-lg font-bold">Revogar Matrícula</Modal.Heading>
                  <p className="text-xs text-muted">
                    Confirmação de exclusão da matrícula
                  </p>
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="py-3 text-sm text-foreground space-y-2">
              <p>
                Tem certeza que deseja remover a matrícula de <strong>{userName}</strong> no curso <strong>{enrollment.courseName}</strong>?
              </p>
              <p className="text-xs text-muted">
                O aluno perderá imediatamente o acesso às aulas e materiais deste curso.
              </p>
            </Modal.Body>

            <Modal.Footer className="justify-between">
              <Button type="button" variant="tertiary" onPress={onClose} isDisabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-danger hover:bg-danger/90 text-white gap-2"
                onPress={handleConfirm}
                isDisabled={isSubmitting}
              >
                <Trash2 className="size-4" />
                {isSubmitting ? "Revogando..." : "Sim, revogar matrícula"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
