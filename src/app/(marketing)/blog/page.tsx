import { getAllArticles } from '@/lib/data/blog';
import { createClient } from '@/lib/supabase/server';
import { FeaturedArticle } from '@/components/blog/FeaturedArticle';
import { FeaturedCarousel } from '@/components/blog/FeaturedCarousel';
import { ArticleCard } from '@/components/blog/ArticleCard';

export const metadata = {
  title: 'Blog',
  description: 'Artigos, áudios e reflexões para você acelerar seu crescimento profissional.',
};

export default async function BlogIndexPage() {
  const supabase = await createClient();
  const articles = await getAllArticles(supabase);
  
  if (articles.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-zinc-500">Nenhum artigo publicado ainda.</p>
      </div>
    );
  }

  const featured = articles.filter((a) => a.featured);
  const remaining = articles.filter((a) => !a.featured);
  
  // Se não houver nenhum artigo marcado como featured, usa o primeiro
  const topFeatured = featured.length > 0 ? featured : [articles[0]];
  const actualRemaining = featured.length > 0 ? remaining : articles.slice(1);

  return (
    <div className="pb-24 pt-[76px]">
      <div className="editorial-container">
        <header className="mb-12 max-w-4xl pt-14 sm:pt-20">
          <p className="eyebrow">Revista Skill Academy</p>
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
          <FeaturedCarousel articles={topFeatured} />
        </section>

        {/* Grid Editorial Section */}
        {actualRemaining.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Últimas publicações
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {actualRemaining.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
