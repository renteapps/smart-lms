import Link from 'next/link';
import { Article } from '@/types/blog';
import { Clock, Headphones, BookOpen, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface FeaturedArticleProps {
  article: Article;
  className?: string;
}

export function FeaturedArticle({ article, className }: FeaturedArticleProps) {
  return (
    <div className={cn("relative rounded-[var(--radius-xl)] overflow-hidden group shadow-sm", className)}>
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={article.cover} 
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-transparent opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/20 to-transparent opacity-80" />
      </div>

      <div className="relative p-8 md:p-12 lg:p-16 flex flex-col justify-end min-h-[500px] md:min-h-[600px]">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sm font-bold text-primary tracking-wider uppercase bg-primary-pale px-3 py-1 rounded-full">
              {article.category}
            </span>
            
            {article.format === 'text' && article.readingTime && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/20 backdrop-blur-md text-sm font-medium text-white border border-white/10">
                <Clock className="w-4 h-4" />
                <span>{article.readingTime} min</span>
              </div>
            )}
            {article.format === 'audio' && article.audio && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-sm font-medium text-primary-foreground shadow-sm">
                <Headphones className="w-4 h-4" />
                <span>{Math.round(article.audio.duration / 60)} min</span>
              </div>
            )}
            {article.format === 'both' && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-sm font-medium text-primary-foreground shadow-sm">
                <BookOpen className="w-4 h-4" />
                <span>Ouvir ou Ler</span>
              </div>
            )}
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight group-hover:text-primary/80 transition-colors duration-[var(--duration-md)]">
            {article.title}
          </h2>
          
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl line-clamp-3">
            {article.excerpt}
          </p>

          <div className="flex items-center gap-6">
            <Link 
              href={`/blog/${article.slug}`}
              className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8 py-6 font-bold hover:scale-105 transition-all text-base")}
            >
              Ler Artigo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-card/20 border border-white/20 flex items-center justify-center font-medium text-white backdrop-blur-sm">
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
