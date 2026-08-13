'use client';

import { Button } from '@heroui/react';
import { Headphones, Pause } from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Article } from '@/types/blog';
import { cn } from '@/lib/utils';

interface PlayArticleButtonProps {
  article: Article;
  className?: string;
}

/**
 * Gatilho de escuta de um artigo. Quando o artigo em questão já está tocando, o
 * botão recua para `secondary`: o estado ativo é do player flutuante, não daqui.
 */
export function PlayArticleButton({ article, className }: PlayArticleButtonProps) {
  const { state, playArticle } = useAudioPlayer();
  const isPlayingThis = state.article?.slug === article.slug && state.isPlaying;

  if (!article.audio) return null;

  return (
    <Button
      variant={isPlayingThis ? 'secondary' : 'primary'}
      size="lg"
      onClick={() => playArticle(article)}
      className={cn('press gap-2 rounded-full', className)}
    >
      {isPlayingThis ? (
        <>
          <Pause className="size-5 fill-current" aria-hidden="true" />
          Pausar áudio
        </>
      ) : (
        <>
          <Headphones className="size-5" aria-hidden="true" />
          Ouvir agora
          <span className="font-semibold opacity-70" data-numeric>
            {Math.round(article.audio.duration / 60)} min
          </span>
        </>
      )}
    </Button>
  );
}
