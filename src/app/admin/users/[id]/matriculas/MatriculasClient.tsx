"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Infinity as InfinityIcon,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Label,
  SearchField,
  Table,
} from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import {
  AvailableCourse,
  EnrollmentItem,
  CreateEnrollmentModal,
  EditEnrollmentModal,
  DeleteEnrollmentModal,
} from "./EnrollmentModals";

interface MatriculasClientProps {
  userId: string;
  userName: string;
  userEmail: string;
  matriculas: EnrollmentItem[];
  availableCourses: AvailableCourse[];
}

export function MatriculasClient({
  userId,
  userName,
  userEmail,
  matriculas,
  availableCourses,
}: MatriculasClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentItem | null>(null);
  const [deletingEnrollment, setDeletingEnrollment] = useState<EnrollmentItem | null>(null);

  const existingCourseIds = matriculas.map((m) => m.courseId);

  const filteredMatriculas = matriculas.filter(
    (m) =>
      m.courseName.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalCount = matriculas.length;
  const concludedCount = matriculas.filter((m) => m.status === "Concluído").length;
  const activeCount = matriculas.filter((m) => m.status === "Em andamento" && !m.isExpired).length;
  const expiredCount = matriculas.filter((m) => m.isExpired).length;

  const isEmpty = matriculas.length === 0;

  return (
    <div className="space-y-7 pb-16">
      <div>
        <Link
          href={`/admin/users/${userId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para o Perfil de {userName}
        </Link>
        <PageHeader
          eyebrow="Aprendizagem"
          title={`Matrículas de ${userName}`}
          description={`Acompanhe os cursos em que ${userName} (${userEmail}) está inscrito, prazos de validade e progresso.`}
          actions={
            <Button
              variant="primary"
              className="gap-2"
              onPress={() => setIsCreateModalOpen(true)}
            >
              <Plus className="size-4" aria-hidden="true" /> Nova matrícula
            </Button>
          }
        />
      </div>

      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3 max-w-md">
            <SearchField
              value={search}
              onChange={setSearch}
              className="w-full"
              aria-label="Buscar nos cursos matriculados"
            >
              <Label className="sr-only">Buscar matrícula</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Buscar por título ou categoria..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {totalCount > 0 && (
              <span className="text-xs text-muted mr-1">
                <strong className="font-semibold text-foreground">{totalCount}</strong> matrícula{totalCount > 1 ? "s" : ""}
              </span>
            )}
            {concludedCount > 0 && (
              <StatusBadge tone="positive">
                {concludedCount} concluído{concludedCount > 1 ? "s" : ""}
              </StatusBadge>
            )}
            {activeCount > 0 && <StatusBadge tone="primary">{activeCount} em andamento</StatusBadge>}
            {expiredCount > 0 && <StatusBadge tone="negative">{expiredCount} expirado{expiredCount > 1 ? "s" : ""}</StatusBadge>}
          </div>
        </Card.Header>

        <Card.Content className="px-0 pb-0">
          {isEmpty ? (
            <EmptyState className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-xl bg-background-secondary">
                <BookOpen className="size-5 text-muted" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">Nenhuma matrícula encontrada</p>
              <p className="text-sm text-muted">
                Inscreva o aluno em um curso para começar a acompanhar o progresso.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4 gap-2"
                onPress={() => setIsCreateModalOpen(true)}
              >
                <Plus className="size-4" /> Matricular Aluno
              </Button>
            </EmptyState>
          ) : filteredMatriculas.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              Nenhuma matrícula corresponde à busca &quot;{search}&quot;.
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden md:block">
                <Table.Root>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Matrículas do aluno">
                      <Table.Header>
                        <Table.Column isRowHeader>Curso</Table.Column>
                        <Table.Column>Categoria</Table.Column>
                        <Table.Column>Progresso</Table.Column>
                        <Table.Column>Status</Table.Column>
                        <Table.Column>Vigência / Validade</Table.Column>
                        <Table.Column>Inscrição</Table.Column>
                        <Table.Column>
                          <span className="sr-only">Ações</span>
                        </Table.Column>
                      </Table.Header>
                      <Table.Body items={filteredMatriculas}>
                        {(mat) => (
                          <Table.Row id={mat.id}>
                            {/* Curso */}
                            <Table.Cell>
                              <Link
                                href={`/admin/cursos/${mat.courseId}`}
                                className="flex items-center gap-3 font-semibold text-foreground hover:text-accent group"
                              >
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                                  <BookOpen className="size-4" aria-hidden="true" />
                                </span>
                                <span className="truncate max-w-xs">{mat.courseName}</span>
                              </Link>
                            </Table.Cell>

                            {/* Categoria */}
                            <Table.Cell>{mat.category}</Table.Cell>

                            {/* Progresso */}
                            <Table.Cell className="font-semibold text-foreground">
                              {mat.progress}
                            </Table.Cell>

                            {/* Status */}
                            <Table.Cell>
                              <StatusBadge tone={mat.statusTone}>{mat.status}</StatusBadge>
                            </Table.Cell>

                            {/* Vigência / Validade */}
                            <Table.Cell>
                              {mat.expiresAt === null ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent-soft/40 px-2 py-0.5 rounded-full">
                                  <InfinityIcon className="size-3.5" /> Vitalício
                                </span>
                              ) : mat.isExpired ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger bg-danger-soft px-2 py-0.5 rounded-full">
                                  <Clock className="size-3" /> {mat.expirationLabel}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground bg-surface-secondary px-2 py-0.5 rounded-full border border-border">
                                  <Calendar className="size-3 text-muted" /> {mat.expirationLabel}
                                </span>
                              )}
                            </Table.Cell>

                            {/* Inscrição */}
                            <Table.Cell className="text-muted text-xs">
                              {mat.enrolledAt}
                            </Table.Cell>

                            {/* Ações */}
                            <Table.Cell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs gap-1.5 h-8 px-2.5 hover:text-accent"
                                  onPress={() => setEditingEnrollment(mat)}
                                  aria-label={`Editar validade da matrícula ${mat.courseName}`}
                                >
                                  <Calendar className="size-3.5" />
                                  <span className="hidden lg:inline">Validade</span>
                                </Button>

                                <Link
                                  href={`/admin/cursos/${mat.courseId}`}
                                  className="inline-flex items-center justify-center size-8 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
                                  aria-label={`Acessar curso ${mat.courseName}`}
                                >
                                  <ExternalLink className="size-3.5" />
                                </Link>

                                <Button
                                  isIconOnly
                                  variant="ghost"
                                  size="sm"
                                  className="size-8 text-muted hover:text-danger hover:bg-danger-soft"
                                  onPress={() => setDeletingEnrollment(mat)}
                                  aria-label={`Revogar matrícula do curso ${mat.courseName}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              {/* Lista Mobile */}
              <ul className="divide-y divide-separator md:hidden">
                {filteredMatriculas.map((mat) => (
                  <li key={mat.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                        <BookOpen className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/cursos/${mat.courseId}`}
                          className="block font-semibold leading-5 text-foreground hover:text-accent truncate"
                        >
                          {mat.courseName}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">{mat.category}</p>
                      </div>
                      <StatusBadge tone={mat.statusTone}>{mat.status}</StatusBadge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted pt-1 border-t border-border/40">
                      <div>
                        Inscrito em: <span className="text-foreground font-medium">{mat.enrolledAt}</span>
                      </div>
                      <div>
                        Progresso: <span className="font-semibold text-foreground">{mat.progress}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="text-xs">
                        {mat.expiresAt === null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                            <InfinityIcon className="size-3" /> Vitalício
                          </span>
                        ) : mat.isExpired ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                            <Clock className="size-3" /> {mat.expirationLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                            <Calendar className="size-3" /> {mat.expirationLabel}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2 gap-1"
                          onPress={() => setEditingEnrollment(mat)}
                        >
                          <Calendar className="size-3" /> Validade
                        </Button>
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          className="size-7 text-muted hover:text-danger hover:bg-danger-soft"
                          onPress={() => setDeletingEnrollment(mat)}
                          aria-label="Revogar matrícula"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Modais */}
      <CreateEnrollmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userId={userId}
        userName={userName}
        availableCourses={availableCourses}
        existingCourseIds={existingCourseIds}
        onSuccess={() => router.refresh()}
      />

      <EditEnrollmentModal
        isOpen={!!editingEnrollment}
        onClose={() => setEditingEnrollment(null)}
        enrollment={editingEnrollment}
        userId={userId}
        userName={userName}
        onSuccess={() => {
          setEditingEnrollment(null);
          router.refresh();
        }}
      />

      <DeleteEnrollmentModal
        isOpen={!!deletingEnrollment}
        onClose={() => setDeletingEnrollment(null)}
        enrollment={deletingEnrollment}
        userId={userId}
        userName={userName}
        onSuccess={() => {
          setDeletingEnrollment(null);
          router.refresh();
        }}
      />
    </div>
  );
}
