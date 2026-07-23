import Link from 'next/link';
import { Article } from '@/types/blog';
import { FeaturedArticle } from './FeaturedArticle';
import { ArticleCard } from './ArticleCard';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HomeBlogSectionProps {
  articles: Article[];
}

export function HomeBlogSection({ articles }: HomeBlogSectionProps) {
  if (articles.length === 0) return null;

  const featured = articles[0];
  const recents = articles.slice(1, 4);

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Insights & Carreira
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Artigos, áudios e reflexões para você acelerar seu crescimento profissional.
            </p>
          </div>
          
          <Link 
            href="/blog"
            className={cn(buttonVariants({ variant: "link" }), "hidden md:flex items-center gap-2 text-primary font-medium px-0")}
          >
            Ver todo o blog
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <FeaturedArticle article={featured} className="h-full" />
          </div>
          
          <div className="lg:col-span-4 flex flex-col gap-8">
            {recents.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </div>

        <div className="mt-8 flex md:hidden justify-center">
          <Link 
            href="/blog"
            className={cn(buttonVariants({ variant: "secondary" }), "inline-flex items-center gap-2 rounded-full px-6 py-6 font-medium")}
          >
            Ver todo o blog
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
