'use client';

import { useState, useEffect, useCallback } from 'react';
import { Article } from '@/types/blog';
import { FeaturedArticle } from './FeaturedArticle';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturedCarouselProps {
  articles: Article[];
}

export function FeaturedCarousel({ articles }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const next = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % articles.length);
  }, [articles.length, isAnimating]);

  const prev = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);
  }, [articles.length, isAnimating]);

  const goTo = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (isPaused || articles.length <= 1) return;

    const timer = setInterval(() => {
      next();
    }, 6000);

    return () => clearInterval(timer);
  }, [isPaused, next, articles.length]);

  if (articles.length === 0) return null;
  if (articles.length === 1) return <FeaturedArticle article={articles[0]} />;

  return (
    <div 
      className="relative group w-full overflow-hidden rounded-[var(--radius-xl)] bg-foreground shadow-elev-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        className="flex transition-transform duration-700 ease-[var(--ease-zen)]"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTransitionEnd={() => setIsAnimating(false)}
      >
        {articles.map((article, idx) => (
          <div key={article.slug} className="w-full shrink-0">
            {/* Removemos rounded-2xl e shadow-elev-4 porque o wrapper já aplica isso */}
            <FeaturedArticle article={article} className="rounded-none shadow-none" />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        aria-label="Artigo anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={next}
        className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        aria-label="Próximo artigo"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {articles.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={cn(
              "transition-all duration-300 rounded-full",
              currentIndex === idx 
                ? "w-8 h-2 bg-white" 
                : "w-2 h-2 bg-white/50 hover:bg-white/80"
            )}
            aria-label={`Ir para artigo ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
