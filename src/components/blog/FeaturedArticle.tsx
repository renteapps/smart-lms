import Link from 'next/link';
import { Article } from '@/types/blog';
import { Clock, Headphones, BookOpen, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import Image from 'next/image';

interface FeaturedArticleProps {
  article: Article;
  className?: string;
}

export function FeaturedArticle({ article, className }: FeaturedArticleProps) {
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl bg-foreground shadow-elev-4", className)}>
      <div className="absolute inset-0">
        <Image
          src={article.cover}
          alt={article.title}
          fill
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.025]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/80 to-transparent opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/20 to-transparent opacity-80" />
      </div>

      <div className="relative flex min-h-[480px] flex-col justify-end p-7 sm:p-10 md:min-h-[560px] lg:p-14">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm font-bold text-accent-soft-foreground tracking-wider uppercase bg-accent-soft px-3 py-1 rounded-full">
              {article.category}
            </span>

            {article.format === 'text' && article.readingTime && (
              <div className="material-thick flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-foreground">
                <Clock className="w-4 h-4" />
                <span>{article.readingTime} min</span>
              </div>
            )}
            {article.format === 'audio' && article.audio && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-sm font-medium text-accent-foreground shadow-sm">
                <Headphones className="w-4 h-4" />
                <span>{Math.round(article.audio.duration / 60)} min</span>
              </div>
            )}
            {article.format === 'both' && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-sm font-medium text-accent-foreground shadow-sm">
                <BookOpen className="w-4 h-4" />
                <span>Ouvir ou Ler</span>
              </div>
            )}
          </div>

          <h2 className="mb-6 text-3xl font-extrabold leading-[1.05] tracking-[-0.045em] text-white md:text-5xl lg:text-6xl">
            {article.title}
          </h2>
          
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl line-clamp-3">
            {article.excerpt}
          </p>

          <div className="flex items-center gap-6">
            <Link 
              href={`/blog/${article.slug}`}
              className={cn(buttonVariants({ size: "lg" }), "min-h-12 rounded-[13px] px-6 font-bold text-base")}
            >
              Ler Artigo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="material-thick w-10 h-10 rounded-full flex items-center justify-center font-medium text-foreground">
                {article.author.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{article.author}</p>
                <p className="text-xs text-white/70">
                  {new Date(article.publishedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
