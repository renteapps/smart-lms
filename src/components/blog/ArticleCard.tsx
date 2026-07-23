import Link from 'next/link';
import { Article } from '@/types/blog';
import { Clock, Headphones, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArticleCardProps {
  article: Article;
  className?: string;
}

export function ArticleCard({ article, className }: ArticleCardProps) {
  return (
    <Link 
      href={`/blog/${article.slug}`}
      className={cn(
        "group flex flex-col rounded-[var(--radius-lg)] overflow-hidden bg-card border border-border/30 shadow-sm transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)] hover:-translate-y-1 hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={article.cover} 
          alt={article.title}
          className="object-cover w-full h-full transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-105"
        />
        
        {/* Format Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          {article.format === 'text' && article.readingTime && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md text-xs font-medium text-foreground border border-border/50">
              <Clock className="w-3.5 h-3.5" />
              <span>{article.readingTime} min</span>
            </div>
          )}
          {article.format === 'audio' && article.audio && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-md text-xs font-medium text-primary-foreground shadow-sm">
              <Headphones className="w-3.5 h-3.5" />
              <span>{Math.round(article.audio.duration / 60)} min</span>
            </div>
          )}
          {article.format === 'both' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-md text-xs font-medium text-primary-foreground shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ouvir ou Ler</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-grow p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-medium text-primary tracking-wider uppercase">
            {article.category}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(article.publishedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-[var(--duration-sm)]">
          {article.title}
        </h3>
        
        <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-grow">
          {article.excerpt}
        </p>

        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border/50">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            {article.author.charAt(0)}
          </div>
          <span className="text-sm font-medium text-foreground">{article.author}</span>
        </div>
      </div>
    </Link>
  );
}
