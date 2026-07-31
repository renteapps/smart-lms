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
    <section className="relative py-16 sm:py-24">
      <div className="editorial-container">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow">Para continuar pensando</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink md:text-4xl">
              Ideias para levar com você
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-text-soft">
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

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <FeaturedArticle article={featured} className="h-full" />
          </div>
          
          <div className="flex flex-col gap-7 lg:col-span-4">
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
