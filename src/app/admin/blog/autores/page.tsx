import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getArticleAuthors } from "@/app/actions/admin/authors";
import { ArticleAuthorsManager } from "./ArticleAuthorsManager";
import { PageHeader } from "@/components/ui/editorial";

export default async function AdminBlogAutoresPage() {
  const authors = await getArticleAuthors();

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
        title="Autores do blog"
        description="Cadastre e gerencie os autores dos artigos com foto, nome e título/cargo."
      />

      <ArticleAuthorsManager initialAuthors={authors} />
    </div>
  );
}
