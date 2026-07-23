import { getAllArticles } from '@/lib/blog';
import { FeaturedArticle } from '@/components/blog/FeaturedArticle';
import { ArticleCard } from '@/components/blog/ArticleCard';

export const metadata = {
  title: 'Blog | Smart LMS',
  description: 'Artigos, áudios e reflexões para você acelerar seu crescimento profissional.',
};

export default function BlogIndexPage() {
  const articles = getAllArticles();
  
  if (articles.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-zinc-500">Nenhum artigo publicado ainda.</p>
      </div>
    );
  }

  const featured = articles.find((a) => a.featured) || articles[0];
  const remaining = articles.filter((a) => a.slug !== featured.slug);

  return (
    <div className="pt-32 pb-24">
      <div className="container mx-auto px-4 md:px-6">
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Insights para sua carreira
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Aprofunde-se em temas como comunicação, liderança e inteligência emocional. 
            Leia no seu tempo ou ouça no trânsito.
          </p>
        </header>

        {/* Featured Section */}
        <section className="mb-24">
          <FeaturedArticle article={featured} />
        </section>

        {/* Grid Editorial Section */}
        {remaining.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Últimas publicações
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {remaining.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
