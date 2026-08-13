"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Edit3, List, Settings } from "lucide-react";
import { Card } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";

export default function AdminCursoDashboard() {
  const params = useParams();
  const id = params.id as string;

  const cards = [
    {
      title: "Editar Curso",
      description: "Edite informações, capas e categorias",
      icon: Edit3,
      href: `/admin/cursos/${id}/editar`,
      tone: "bg-accent-soft text-accent-soft-foreground",
    },
    {
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
          title={`Gerenciar curso #${id}`}
          description="Selecione uma área abaixo para gerenciar este curso."
        />
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
