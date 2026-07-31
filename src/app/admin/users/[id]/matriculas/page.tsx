"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, MoreHorizontal, Plus } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";

const mockMatriculas = [
  { id: "1", courseName: "Inteligência Emocional no Trabalho", category: "Comportamental", progress: "72%", status: "Em andamento", enrolledAt: "10 mai, 2026" },
  { id: "2", courseName: "Gestão de Tempo e Foco", category: "Produtividade", progress: "100%", status: "Concluído", enrolledAt: "15 abr, 2026" },
  { id: "3", courseName: "Liderança por Influência", category: "Liderança", progress: "0%", status: "Não iniciado", enrolledAt: "Hoje, 09:12" },
];

export default function AdminUserMatriculasPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="space-y-7 pb-16">
      <div>
        <Link href={`/admin/users/${id}`} className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Perfil
        </Link>
        <PageHeader 
          eyebrow="Aprendizagem" 
          title="Matrículas" 
          description="Acompanhe os cursos em que o usuário está inscrito e seu progresso."
          actions={<button className="inline-flex min-h-11 items-center gap-2 rounded-[11px] bg-primary px-4 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-active"><Plus className="h-4 w-4" /> Nova matrícula</button>}
        />
      </div>

      <section className="editorial-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <h2 className="font-bold text-ink text-lg">Cursos do Aluno</h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-mute">
            <StatusBadge tone="positive">1 concluído</StatusBadge>
            <StatusBadge tone="primary">1 em andamento</StatusBadge>
          </div>
        </div>

        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas-soft/75 text-[11px] font-bold uppercase tracking-[0.09em] text-text-mute">
                <th className="px-5 py-3.5">Curso</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5">Progresso</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Data de Inscrição</th>
                <th className="w-16 px-5 py-3.5"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {mockMatriculas.map((mat) => (
                <tr key={mat.id} className="border-t border-border/70 hover:bg-primary-pale/20">
                  <td className="px-5 py-4">
                    <Link href={`/admin/cursos/${mat.id}`} className="flex items-center gap-3 font-bold text-ink hover:text-primary-active">
                      <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-primary-pale text-primary">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      {mat.courseName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm text-text-soft">{mat.category}</td>
                  <td className="px-5 py-4 text-sm font-bold text-ink">{mat.progress}</td>
                  <td className="px-5 py-4">
                    <StatusBadge tone={mat.status === "Concluído" ? "positive" : mat.status === "Em andamento" ? "primary" : "neutral"}>
                      {mat.status}
                    </StatusBadge>
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-text-mute">{mat.enrolledAt}</td>
                  <td className="px-5 py-4">
                    <button aria-label={`Ações da matrícula ${mat.courseName}`} className="grid h-10 w-10 place-items-center rounded-[10px] text-text-mute hover:bg-surface-hover hover:text-ink">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {mockMatriculas.map((mat) => (
            <article key={mat.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-primary-pale text-primary">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/cursos/${mat.id}`} className="font-bold leading-5 text-ink hover:text-primary-active block">
                    {mat.courseName}
                  </Link>
                  <p className="mt-1 text-xs text-text-mute">{mat.category}</p>
                </div>
                <StatusBadge tone={mat.status === "Concluído" ? "positive" : mat.status === "Em andamento" ? "primary" : "neutral"}>
                  {mat.status}
                </StatusBadge>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-medium text-text-mute">
                <span>Inscrito em {mat.enrolledAt.toLowerCase()}</span>
                <span className="font-bold text-ink">{mat.progress} completo</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
