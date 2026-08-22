import Link from 'next/link';
import { Article } from '@/types/blog';
import { Clock, Headphones, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const FALLBACK_BLOG_COVER =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1400&auto=format&fit=crop";

interface ArticleCardProps {
  article: Article;
  className?: string;
}

export function ArticleCard({ article, className }: ArticleCardProps) {
  const coverSrc = article.cover && article.cover.trim() !== "" ? article.cover : FALLBACK_BLOG_COVER;

  return (
    <Link 
      href={`/blog/${article.slug}`}
      className={cn(
        "editorial-card editorial-card-interactive group flex flex-col overflow-hidden",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-background-secondary">
        <Image
          src={coverSrc}
          alt={article.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--spring)] group-hover:scale-[1.035]"
        />

        {/* Format Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          {article.format === 'text' && article.readingTime && (
            <div className="material-thick flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{article.readingTime} min</span>
            </div>
          )}
          {article.format === 'audio' && article.audio && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/90 backdrop-blur-md text-xs font-medium text-accent-foreground shadow-sm">
              <Headphones className="w-3.5 h-3.5" />
              <span>{Math.round(article.audio.duration / 60)} min</span>
            </div>
          )}
          {article.format === 'both' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/90 backdrop-blur-md text-xs font-medium text-accent-foreground shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ouvir ou Ler</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-grow flex-col p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-bold text-primary tracking-wider uppercase">
            {article.category}
          </span>
          <span className="text-xs text-muted">
            {new Date(article.publishedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        <h3 className="mb-2 line-clamp-2 text-xl font-extrabold tracking-[-0.025em] text-foreground group-hover:text-accent-hover">
          {article.title}
        </h3>

        <p className="text-muted text-sm line-clamp-3 mb-4 flex-grow">
          {article.excerpt}
        </p>

        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-hairline">
          <div className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center text-sm font-medium text-muted">
            {article.author.charAt(0)}
          </div>
          <span className="text-sm font-medium text-foreground">{article.author}</span>
        </div>
      </div>
    </Link>
  );
}
