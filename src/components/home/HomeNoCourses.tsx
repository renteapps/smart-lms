"use client";

import Link from "next/link";
import Image from "next/image";
import { ExternalLink, ShoppingBag, BookOpen } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import { Card } from "@heroui/react/card";
import { Rise } from "@/components/ui/Rise";
import { cn } from "@/lib/utils";
import type { SaleCourse } from "@/hooks/useUserAccess";
import { useAuth } from "@/contexts/AuthContext";
import { resolveDynamicSalesUrl } from "@/lib/salesUrlHelper";

interface HomeNoCoursesProps {
  courses: SaleCourse[];
}

const LEVEL_COLORS: Record<string, string> = {
  Essencial: "bg-success-soft/40 text-success-foreground",
  Intermediário: "bg-warning-soft/40 text-warning-foreground",
  Avançado: "bg-danger-soft/40 text-danger-foreground",
};

/**
 * Vitrine de compra de cursos.
 *
 * Exibida quando o usuário logado não tem nenhuma matrícula ativa nem
 * assinatura ativa — ou seja, não tem acesso a nenhum conteúdo da plataforma.
 *
 * Em vez de levar ao onboarding (que não faz sentido sem conteúdo comprado),
 * mostramos os cursos disponíveis com seus links de compra.
 */
export default function HomeNoCourses({ courses }: HomeNoCoursesProps) {
  const { user } = useAuth();
  const hasCourses = courses.length > 0;

  return (
    <main className="editorial-container py-[clamp(4rem,8vw,7rem)]">
      <Rise>
        {/* Ícone de entrada */}
        <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
          <ShoppingBag size={28} aria-hidden="true" />
        </span>

        <p className="eyebrow mt-7">Catálogo de Cursos</p>
        <h1 className="display-1 mt-3 max-w-3xl text-foreground">
          Comece sua jornada de aprendizado.
        </h1>
        <p className="lede mt-5 max-w-2xl">
          {hasCourses
            ? "Adquira um dos cursos abaixo para desbloquear seu acesso completo e montar sua trilha de estudo personalizada."
            : "Em breve nossos cursos estarão disponíveis aqui. Entre em contato para saber mais."}
        </p>
      </Rise>

      {/* Lista de cursos */}
      {hasCourses ? (
        <div className="mt-[clamp(3rem,5vw,4rem)] grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <Rise key={course.id} delay={index * 70}>
              <CourseCard course={course} user={user} />
            </Rise>
          ))}
        </div>
      ) : (
        <Rise delay={100}>
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-default text-foreground">
              <BookOpen size={32} aria-hidden="true" />
            </span>
            <p className="max-w-sm text-muted">
              Nenhum curso disponível no momento. Nossa equipe está preparando
              conteúdos incríveis para você.
            </p>
            <a
              href="mailto:contato@smartlms.com.br"
              className={cn(buttonVariants({ variant: "outline", size: "md" }))}
            >
              Entrar em contato
            </a>
          </div>
        </Rise>
      )}
    </main>
  );
}

function CourseCard({
  course,
  user,
}: {
  course: SaleCourse;
  user: ReturnType<typeof useAuth>["user"];
}) {
  const levelColor =
    LEVEL_COLORS[(course.level as string) ?? ""] ?? "bg-default text-muted";

  const resolvedUrl = course.sales_url
    ? resolveDynamicSalesUrl(course.sales_url, {
        contact: {
          name:
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            undefined,
          email: user?.email || undefined,
          phone: user?.user_metadata?.phone || undefined,
          id: user?.id,
        },
        course: {
          id: course.id,
          title: course.title,
          category: course.category,
        },
      })
    : null;

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-hairline transition-shadow hover:shadow-md">
      {/* Capa do curso */}
      <div className="relative aspect-video w-full overflow-hidden bg-default">
        {course.cover_url ? (
          <Image
            src={course.cover_url}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen size={40} className="text-muted/40" aria-hidden="true" />
          </div>
        )}

        {/* Badge de nível */}
        {course.level && (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              levelColor,
            )}
          >
            {course.level}
          </span>
        )}
      </div>

      <Card.Content className="flex flex-1 flex-col gap-3 p-5">
        {/* Categoria */}
        {course.category && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {course.category}
          </p>
        )}

        {/* Título */}
        <h2 className="font-display text-base font-extrabold leading-snug tracking-[-0.02em] text-foreground">
          {course.title}
        </h2>

        {/* Descrição */}
        {course.description && (
          <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
            {course.description}
          </p>
        )}

        {/* Metadados */}
        {course.duration && (
          <p className="text-xs text-muted/70">{course.duration}</p>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          {resolvedUrl ? (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "primary", size: "sm" }),
                "icon-draw w-full justify-center gap-1.5",
              )}
            >
              Comprar curso
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full cursor-not-allowed justify-center opacity-50",
              )}
              aria-disabled="true"
            >
              Em breve
            </span>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
