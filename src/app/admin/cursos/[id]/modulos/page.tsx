import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ModuleList from "@/components/admin/ModuleList";
import { MOCK_COURSE } from "@/lib/mockData";

export default async function ModulosAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <Link 
          href={`/admin/cursos/${resolvedParams.id}`} 
          className="inline-flex items-center gap-2 text-text-soft hover:text-primary transition-colors text-sm font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Curso
        </Link>
        <h1 className="text-3xl font-display font-bold">Gerenciar Módulos e Aulas</h1>
        <p className="text-text-soft mt-2">
          Organize o conteúdo do curso arrastando módulos e aulas. Adicione novos conteúdos conforme necessário.
        </p>
      </div>

      <ModuleList courseId={resolvedParams.id} initialCourse={MOCK_COURSE} />
    </div>
  );
}
