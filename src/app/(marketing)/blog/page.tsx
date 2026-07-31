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
    <div className="pb-24 pt-[76px]">
      <div className="editorial-container">
        <header className="mb-12 max-w-4xl pt-14 sm:pt-20">
          <p className="eyebrow">Revista Smart LMS</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-ink md:text-5xl lg:text-6xl">
            Reflexões para crescer com intenção
          </h1>
          <p className="mt-5 max-w-2xl text-xl leading-8 text-text-soft">
            Aprofunde-se em temas como comunicação, liderança e inteligência emocional. 
            Leia no seu tempo ou ouça no trânsito.
          </p>
        </header>

        {/* Featured Section */}
        <section className="mb-20">
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
