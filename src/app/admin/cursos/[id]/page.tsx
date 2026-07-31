"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Edit3, List, Settings, ArrowLeft } from "lucide-react";

export default function AdminCursoDashboard() {
  const params = useParams();
  const id = params.id as string;

  const cards = [
    {
      title: "Editar Curso",
      description: "Edite informações, capas e categorias",
      icon: Edit3,
      href: `/admin/cursos/${id}/editar`,
      color: "bg-primary"
    },
    {
      title: "Módulos",
      description: "Adicione ou edite aulas e módulos",
      icon: List,
      href: `/admin/cursos/${id}/modulos`,
      color: "bg-positive"
    },
    {
      title: "Configurações",
      description: "Ajustes gerais de exibição do curso",
      icon: Settings,
      href: `/admin/cursos/${id}/configuracoes`,
      color: "bg-accent-orange"
    }
  ];

  return (
    <div className="space-y-7">
      <div className="mb-6">
        <Link href="/admin/cursos" className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Lista
        </Link>
        <p className="eyebrow">Conteúdo</p>
        <h1 className="mt-2 text-3xl font-extrabold">Gerenciar curso #{id}</h1>
        <p className="text-text-soft mt-1">Selecione uma área abaixo para gerenciar este curso.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link 
              key={i} 
              href={card.href}
              className="editorial-card editorial-card-interactive group block p-6"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h2 className="mb-2 text-xl font-extrabold group-hover:text-primary-active">{card.title}</h2>
              <p className="text-text-soft text-sm leading-relaxed">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
