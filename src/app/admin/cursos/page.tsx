import Link from "next/link";
import { BookOpen, MoreHorizontal, Plus, Search } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/editorial";

const mockCourses = [
  { id: "1", title: "Inteligência Emocional no Trabalho", category: "Comportamental", lessons: 15, status: "Publicado", updated: "Hoje, 09:42" },
  { id: "2", title: "Gestão de Tempo e Foco", category: "Produtividade", lessons: 12, status: "Publicado", updated: "Ontem, 17:20" },
  { id: "3", title: "Liderança por Influência", category: "Liderança", lessons: 20, status: "Rascunho", updated: "28 jul, 14:08" },
  { id: "4", title: "Feedback que Transforma", category: "Comunicação", lessons: 8, status: "Publicado", updated: "26 jul, 11:35" },
  { id: "5", title: "Negociação Ganha-Ganha", category: "Habilidades", lessons: 10, status: "Rascunho", updated: "24 jul, 16:02" },
];

export default function AdminCursosList() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Conteúdo" title="Cursos" description="Crie, organize e acompanhe todo o catálogo de aprendizagem." actions={<Link href="/admin/cursos/novo" className="inline-flex min-h-11 items-center gap-2 rounded-[11px] bg-primary px-4 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-active"><Plus className="h-4 w-4" /> Novo curso</Link>} />

      <section className="editorial-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <label className="relative block w-full sm:max-w-md"><span className="sr-only">Buscar curso</span><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" /><input placeholder="Buscar curso..." className="h-11 w-full rounded-[11px] border border-border bg-canvas-soft pl-10 pr-4 text-sm focus:border-primary focus:bg-surface focus:outline-none" /></label>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-mute"><StatusBadge tone="positive">24 publicados</StatusBadge><StatusBadge tone="warning">3 rascunhos</StatusBadge></div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead><tr className="bg-canvas-soft/75 text-[11px] font-bold uppercase tracking-[0.09em] text-text-mute"><th className="px-5 py-3.5">Curso</th><th className="px-5 py-3.5">Categoria</th><th className="px-5 py-3.5">Aulas</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Atualização</th><th className="w-16 px-5 py-3.5"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>{mockCourses.map((course) => <tr key={course.id} className="border-t border-border/70 hover:bg-primary-pale/20"><td className="px-5 py-4"><Link href={`/admin/cursos/${course.id}`} className="flex items-center gap-3 font-bold text-ink hover:text-primary-active"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-primary-pale text-primary"><BookOpen className="h-4 w-4" /></span>{course.title}</Link></td><td className="px-5 py-4 text-sm text-text-soft">{course.category}</td><td className="px-5 py-4 text-sm font-semibold text-text-soft">{course.lessons}</td><td className="px-5 py-4"><StatusBadge tone={course.status === "Publicado" ? "positive" : "warning"}>{course.status}</StatusBadge></td><td className="px-5 py-4 text-xs font-medium text-text-mute">{course.updated}</td><td className="px-5 py-4"><Link href={`/admin/cursos/${course.id}`} aria-label={`Gerenciar ${course.title}`} className="grid h-10 w-10 place-items-center rounded-[10px] text-text-mute hover:bg-surface-hover hover:text-ink"><MoreHorizontal className="h-5 w-5" /></Link></td></tr>)}</tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {mockCourses.map((course) => <article key={course.id} className="p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-primary-pale text-primary"><BookOpen className="h-4 w-4" /></span><div className="min-w-0 flex-1"><Link href={`/admin/cursos/${course.id}`} className="font-bold leading-5 text-ink">{course.title}</Link><p className="mt-1 text-xs text-text-mute">{course.category} · {course.lessons} aulas</p></div><StatusBadge tone={course.status === "Publicado" ? "positive" : "warning"}>{course.status}</StatusBadge></div><div className="mt-4 flex items-center justify-between"><span className="text-xs font-medium text-text-mute">Atualizado {course.updated.toLowerCase()}</span><Link href={`/admin/cursos/${course.id}`} className="min-h-10 rounded-[10px] bg-primary-pale px-3 py-2 text-sm font-bold text-primary-active">Gerenciar</Link></div></article>)}
        </div>
      </section>
    </div>
  );
}
