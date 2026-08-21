import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Edit3, Eye, List, Settings, ShoppingBag } from "lucide-react";
import { Card, buttonVariants } from "@heroui/react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";
import { getCourseById } from "@/lib/data/courses";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";

export default async function AdminCursoDashboard({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  const supabase = await createClient();
  const course = await getCourseById(supabase, id);

  if (!course) {
    notFound();
  }

  const isGallery = course.layout === "gallery";

  const cards = [
    {
      title: "Editar Curso",
      description: "Edite informações, capas e categorias",
      icon: Edit3,
      href: `/admin/cursos/${id}/editar`,
      tone: "bg-accent-soft text-accent-soft-foreground",
    },
    isGallery
      ? {
          title: "Aulas",
          description: "Adicione, edite e reordene as aulas da galeria",
          icon: List,
          href: `/admin/cursos/${id}/aulas-galeria`,
          tone: "bg-success-soft text-success-soft-foreground",
        }
      : {
          title: "Módulos",
          description: "Adicione ou edite aulas e módulos",
          icon: List,
          href: `/admin/cursos/${id}/modulos`,
          tone: "bg-success-soft text-success-soft-foreground",
        },
    {
      title: "Configurações",
      description: "Ajustes gerais de exibição do curso",
      icon: Settings,
      href: `/admin/cursos/${id}/configuracoes`,
      tone: "bg-warning-soft text-warning-soft-foreground",
    },
    {
      title: "Vendas",
      description: "Integrações, oferta e tempo de acesso",
      icon: ShoppingBag,
      href: `/admin/cursos/${id}/vendas`,
      tone: "bg-info-soft text-info-soft-foreground",
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <Link
          href="/admin/cursos"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para Lista
        </Link>
        <PageHeader
          eyebrow="Conteúdo"
          title={`Gerenciar: ${course.title}`}
          description="Selecione uma área abaixo para gerenciar este curso."
        />
      </div>

      {/* Banner de resumo do curso com capa */}
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:p-6 shadow-sm">
        {course.coverUrl ? (
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-background-secondary sm:w-56">
            <img src={course.coverUrl} alt={course.title} className="size-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-video w-full shrink-0 items-center justify-center rounded-xl bg-background-secondary sm:w-56">
            <BookOpen className="size-8 text-muted" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">{course.category}</span>
            <StatusBadge
              tone={
                course.status === "Publicado"
                  ? "positive"
                  : course.status === "Rascunho"
                    ? "warning"
                    : "neutral"
              }
            >
              {course.status || (course.isPublished ? "Publicado" : "Rascunho")}
            </StatusBadge>
          </div>
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">{course.title}</h2>
          {course.shortDescription && (
            <p className="line-clamp-2 text-sm text-muted">{course.shortDescription}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2 sm:self-center">
          <Link
            href={`/courses/${course.slug || course.id}`}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Eye className="size-4" aria-hidden="true" />
            Visualizar
          </Link>
          <Link
            href={`/admin/cursos/${id}/editar`}
            className={cn(buttonVariants({ variant: "primary", size: "sm" }), "gap-1.5")}
          >
            <Edit3 className="size-4" aria-hidden="true" />
            Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group block rounded-xl">
              <Card className="h-full transition-shadow group-hover:shadow-overlay">
                <Card.Header>
                  <span className={`mb-2 grid size-12 place-items-center rounded-xl ${card.tone}`}>
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <Card.Title className="group-hover:text-accent">{card.title}</Card.Title>
                  <Card.Description>{card.description}</Card.Description>
                </Card.Header>
                <Card.Footer>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                    Abrir
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Card.Footer>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
