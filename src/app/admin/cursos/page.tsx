import Link from "next/link";
import { PlusCircle, Search, MoreVertical } from "lucide-react";

// Simulando dados que viriam do banco
const mockCourses = [
  { id: "1", title: "Inteligência Emocional no Trabalho", category: "Comportamental", lessons: 15, status: "Publicado" },
  { id: "2", title: "Gestão de Tempo e Foco", category: "Produtividade", lessons: 12, status: "Publicado" },
  { id: "3", title: "Liderança por Influência", category: "Liderança", lessons: 20, status: "Rascunho" },
  { id: "4", title: "Feedback que Transforma", category: "Comunicação", lessons: 8, status: "Publicado" },
  { id: "5", title: "Negociação Ganha-Ganha", category: "Habilidades", lessons: 10, status: "Rascunho" }
];

export default function AdminCursosList() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-display font-black text-primary">Cursos</h1>
        <button className="bg-primary text-on-primary px-6 py-3 rounded-full font-semibold hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5">
          <PlusCircle className="w-5 h-5" />
          <span>Novo Curso</span>
        </button>
      </div>
      
      <div className="bg-surface-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-border/40">
        <div className="p-6 border-b border-border/40 flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-mute" />
            <input 
              type="text" 
              placeholder="Buscar curso..." 
              className="w-full bg-canvas-soft border-transparent rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border/40 bg-surface-hover/50">
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider">Título</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider">Categoria</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider">Aulas</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 font-semibold text-text-soft text-sm uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mockCourses.map((course, index) => (
                <tr 
                  key={course.id} 
                  className="border-b border-border/40 hover:bg-surface-hover transition-colors group"
                >
                  <td className="py-4 px-6 font-medium">
                    <Link href={`/admin/cursos/${course.id}`} className="hover:text-primary transition-colors text-ink-deep font-semibold">
                      {course.title}
                    </Link>
                  </td>
                  <td className="py-4 px-6 text-text-soft">{course.category}</td>
                  <td className="py-4 px-6 text-text-soft">{course.lessons} aulas</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      course.status === 'Publicado' 
                        ? 'bg-positive/10 text-positive' 
                        : 'bg-warning/10 text-yellow-600'
                    }`}>
                      {course.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link 
                      href={`/admin/cursos/${course.id}`} 
                      className="text-sm font-medium text-primary hover:bg-primary/10 px-4 py-2 bg-primary/5 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    >
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
