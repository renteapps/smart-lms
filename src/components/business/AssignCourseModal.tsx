"use client";

import React, { useState } from "react";
import {
  Button,
  Chip,
  Modal,
  SearchField,
  Label,
} from "@heroui/react";
import { BookOpen, Check, Sparkles } from "lucide-react";
import { Company, CompanyMember } from "@/types/business";
import { CATALOG_COURSES } from "@/lib/catalog";
import { assignCoursesToDepartment, assignCoursesToMember } from "@/lib/businessStorage";
import { toast } from "sonner";

interface AssignCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  targetMember?: CompanyMember | null;
  targetDepartment?: string | null;
  onSuccess: () => void;
}

export function AssignCourseModal({
  isOpen,
  onClose,
  company,
  targetMember,
  targetDepartment,
  onSuccess,
}: AssignCourseModalProps) {
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(
    targetMember?.assignedCourseIds || []
  );
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCourses = CATALOG_COURSES.filter((c) =>
    company.allowedCourseIds.includes(c.id)
  );

  const filteredCourses = availableCourses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCourse = (courseId: string) => {
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== courseId));
    } else {
      setSelectedCourseIds([...selectedCourseIds, courseId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCourseIds.length === availableCourses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(availableCourses.map((c) => c.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCourseIds.length === 0) {
      toast.error("Selecione pelo menos um curso para atribuir.");
      return;
    }

    setIsSubmitting(true);

    if (targetMember) {
      const ok = assignCoursesToMember(targetMember.id, selectedCourseIds);
      setIsSubmitting(false);
      if (ok) {
        toast.success(`Cursos atualizados para ${targetMember.name}!`);
        onSuccess();
        onClose();
      } else {
        toast.error("Erro ao atribuir cursos.");
      }
    } else if (targetDepartment) {
      const res = assignCoursesToDepartment(company.id, targetDepartment, selectedCourseIds);
      setIsSubmitting(false);
      if (res.success) {
        toast.success(
          `${selectedCourseIds.length} curso(s) atribuído(s) para todos os ${res.affectedMembersCount} colaboradores do departamento ${targetDepartment}!`
        );
        onSuccess();
        onClose();
      } else {
        toast.error("Erro ao atribuir cursos ao departamento.");
      }
    }
  };

  const title = targetMember
    ? `Atribuir Cursos: ${targetMember.name}`
    : targetDepartment
    ? `Atribuir Cursos: Departamento ${targetDepartment}`
    : "Atribuir Cursos";

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <BookOpen className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Modal.Heading>{title}</Modal.Heading>
                    <p className="text-xs text-muted">
                      Selecione os cursos da grade corporativa que devem compor a jornada.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <SearchField
                    value={search}
                    onChange={setSearch}
                    className="w-full"
                    aria-label="Buscar curso"
                  >
                    <Label className="sr-only">Buscar curso</Label>
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Buscar por título ou categoria..." />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onPress={handleSelectAll}
                  >
                    {selectedCourseIds.length === availableCourses.length ? "Desmarcar todos" : "Marcar todos"}
                  </Button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 rounded-xl border border-border bg-surface p-2">
                  {filteredCourses.map((course) => {
                    const isSelected = selectedCourseIds.includes(course.id);
                    return (
                      <div
                        key={course.id}
                        onClick={() => toggleCourse(course.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "border-accent bg-accent-soft/40 shadow-xs"
                            : "border-border hover:border-border-hover bg-surface hover:bg-surface-secondary/60"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <span
                            className={`grid size-5 shrink-0 place-items-center rounded border ${
                              isSelected
                                ? "bg-accent border-accent text-accent-foreground"
                                : "border-border bg-surface"
                            }`}
                          >
                            {isSelected && <Check className="size-3.5" />}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {course.title}
                            </p>
                            <p className="text-xs text-muted truncate">
                              {course.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Chip variant="soft" size="sm">{course.category}</Chip>
                          <span className="text-[11px] text-muted hidden sm:inline">{course.duration}</span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredCourses.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted">
                      Nenhum curso encontrado no catálogo contratado da empresa.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted bg-surface-secondary/40 p-2.5 rounded-lg border border-border">
                  <span>
                    <strong>{selectedCourseIds.length}</strong> de {availableCourses.length} cursos selecionados
                  </span>
                  <span className="text-accent font-semibold flex items-center gap-1">
                    <Sparkles className="size-3" /> Acesso imediato aos alunos
                  </span>
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button type="button" variant="tertiary" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isDisabled={isSubmitting}>
                  <BookOpen className="size-4 mr-1.5" />
                  Salvar Atribuição
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
