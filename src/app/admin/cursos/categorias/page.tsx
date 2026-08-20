import { getCategories, getTags } from "@/app/actions/admin/categories";
import { CategoriesManager } from "./CategoriesManager";
import { PageHeader } from "@/components/ui/editorial";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AdminCategoriasPage() {
  const categories = await getCategories();
  const tags = await getTags();

  return (
    <div className="space-y-7">
      <Link
        href="/admin/cursos"
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para cursos
      </Link>
      
      <PageHeader
        eyebrow="Configurações"
        title="Categorias e Tags"
        description="Gerencie as opções disponíveis para classificação dos cursos."
      />

      <CategoriesManager initialCategories={categories} initialTags={tags} />
    </div>
  );
}
