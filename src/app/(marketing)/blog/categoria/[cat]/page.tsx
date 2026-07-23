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
    <div className="pt-32 pb-24">
      <div className="container mx-auto px-4 md:px-6">
        <header className="mb-16">
          <Link 
            href="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o blog
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            <span className="text-primary">Categoria:</span> {formattedCat}
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
