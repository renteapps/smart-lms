'use client';

import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Article } from '@/types/blog';
import { Headphones, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayArticleButtonProps {
  article: Article;
  className?: string;
}

export function PlayArticleButton({ article, className }: PlayArticleButtonProps) {
  const { state, playArticle } = useAudioPlayer();
  const isPlayingThis = state.article?.slug === article.slug && state.isPlaying;

  if (!article.audio) return null;

  return (
    <button 
      onClick={() => playArticle(article)}
      className={cn(
        "px-6 py-3 rounded-[var(--radius-full)] font-bold transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)] flex items-center gap-2",
        isPlayingThis 
          ? "bg-canvas-soft text-text hover:bg-surface border border-border/50" 
          : "bg-primary text-on-primary hover:bg-primary-active",
        className
      )}
    >
      {isPlayingThis ? (
        <>
          <Pause className="w-5 h-5 fill-current" />
          Pausar Áudio
        </>
      ) : (
        <>
          <Play className="w-5 h-5 fill-current" />
          Ouvir Agora ({Math.round(article.audio.duration / 60)} min)
        </>
      )}
    </button>
  );
}
