import { notFound } from 'next/navigation';
import { getArticlesByCategory, getAllArticles } from '@/lib/blog';
import { ArticleCard } from '@/components/blog/ArticleCard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export async function generateStaticParams() {
  const articles = getAllArticles();
  const categories = Array.from(new Set(articles.map((a) => a.category.toLowerCase())));
  return categories.map((cat) => ({ cat }));
}

export async function generateMetadata({ params }: { params: Promise<{ cat: string }> }) {
  const resolvedParams = await params;
  const decodedCat = decodeURIComponent(resolvedParams.cat);
  const formattedCat = decodedCat.charAt(0).toUpperCase() + decodedCat.slice(1);
  
  return {
    title: `${formattedCat} | Blog`,
    description: `Artigos sobre ${formattedCat} para acelerar sua carreira.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ cat: string }> }) {
  const resolvedParams = await params;
  const decodedCat = decodeURIComponent(resolvedParams.cat);
  const formattedCat = decodedCat.charAt(0).toUpperCase() + decodedCat.slice(1);
  
  const articles = getArticlesByCategory(decodedCat);
  
  if (articles.length === 0) {
    notFound();
  }

  return (
    <div className="pb-24 pt-[120px] sm:pt-36">
      <div className="editorial-container">
        <header className="mb-14 max-w-4xl">
          <Link 
            href="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o blog
          </Link>
          <p className="eyebrow">Categoria</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-ink md:text-5xl">
            {formattedCat}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Explorando insights e estratégias sobre {formattedCat.toLowerCase()}.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} className="h-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
