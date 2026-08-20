import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getArticleCategories } from "@/app/actions/admin/categories";
import { ArticleCategoriesManager } from "./ArticleCategoriesManager";
import { PageHeader } from "@/components/ui/editorial";

export default async function AdminBlogCategoriasPage() {
  const categories = await getArticleCategories();

  return (
    <div className="space-y-7">
      <Link
        href="/admin/blog"
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para o blog
      </Link>

      <PageHeader
        eyebrow="Configurações"
        title="Categorias do blog"
        description="Gerencie as opções disponíveis para classificação dos artigos."
      />

      <ArticleCategoriesManager initialCategories={categories} />
    </div>
  );
}
