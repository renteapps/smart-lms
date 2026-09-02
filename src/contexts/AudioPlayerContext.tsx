'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Article } from '@/types/blog';

interface AudioState {
  article: Article | null;
  isPlaying: boolean;
  progress: number; // 0 to 1
  currentTime: number; // seconds
  duration: number; // seconds
  playbackRate: number;
}

interface AudioPlayerContextType {
  state: AudioState;
  playArticle: (article: Article, startAt?: number) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  closePlayer: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  /**
   * O elemento de áudio em si, para quem precisa do tempo a cada quadro.
   *
   * `state.currentTime` é atualizado uma vez por segundo de propósito (é o que
   * o relógio precisa, e re-renderizar a árvore 60x por segundo seria caro),
   * mas isso faz a onda avançar aos saltos. Quem desenha progresso lê daqui e
   * escreve direto no nó dentro de um `requestAnimationFrame` — a mesma técnica
   * que o `Reveal` usa para o foco de luz (design.md §12).
   */
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

const STORAGE_KEY = 'smart_lms_audio_progress';

/**
 * Posição salva de um artigo, em segundos.
 *
 * Exportado porque o player da página do artigo precisa dela antes de o áudio
 * virar o áudio ativo — é o que permite o botão dizer "continuar em 4:12" em vez
 * de "ouvir agora" para quem já começou. Ler o `localStorage` direto no
 * componente duplicaria a chave em dois arquivos.
 */
export function getSavedAudioProgress(slug: string): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed[slug] || 0;
    }
  } catch (e) {
    console.error('Failed to get audio progress', e);
  }
  return 0;
}

function saveProgress(slug: string, time: number) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || '{}';
    const parsed = JSON.parse(stored);
    parsed[slug] = time;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('Failed to save audio progress', error);
  }
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AudioState>({
    article: null,
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastRenderedSecondRef = useRef(-1);
  const lastSavedBucketRef = useRef(-1);

  // Initialize audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      const wholeSecond = Math.floor(audio.currentTime);
      if (wholeSecond === lastRenderedSecondRef.current) return;
      lastRenderedSecondRef.current = wholeSecond;

      setState(prev => {
        const newTime = audio.currentTime;
        const progress = audio.duration ? newTime / audio.duration : 0;
        
        const saveBucket = Math.floor(newTime / 5);
        if (wholeSecond % 5 === 0 && saveBucket !== lastSavedBucketRef.current && prev.article) {
          lastSavedBucketRef.current = saveBucket;
          saveProgress(prev.article.slug, newTime);
        }

        return {
          ...prev,
          currentTime: newTime,
          progress,
        };
      });
    };

    const handleDurationChange = () => {
      setState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, progress: 1 }));
    };

    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));

    // Ao pausar ou buscar, o quadro a quadro para de valer e o estado do React
    // volta a ser a fonte da posição — então ele precisa estar exato neste
    // instante, não até um segundo atrás.
    const syncTime = () => {
      lastRenderedSecondRef.current = Math.floor(audio.currentTime);
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        progress: audio.duration ? audio.currentTime / audio.duration : prev.progress,
      }));
    };

    const handlePause = () => {
      syncTime();
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('seeked', syncTime);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('seeked', syncTime);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
    };
  }, []);

  /**
   * `startAt` existe para quem já escolheu a posição antes de dar play — o
   * player da página do artigo deixa arrastar a onda com o áudio parado, e sem
   * isso o play pularia de volta para a posição salva, desfazendo o gesto.
   */
  const playArticle = (article: Article, startAt?: number) => {
    if (!article.audio) return;

    if (state.article?.slug === article.slug) {
      // Toggle if it's the same article
      togglePlayPause();
      return;
    }

    const savedTime = startAt ?? getSavedAudioProgress(article.slug);
    lastRenderedSecondRef.current = Math.floor(savedTime);
    lastSavedBucketRef.current = Math.floor(savedTime / 5);
    
    if (audioRef.current) {
      audioRef.current.src = article.audio.url;
      audioRef.current.currentTime = savedTime;
      audioRef.current.playbackRate = state.playbackRate;
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }

    setState(prev => ({
      ...prev,
      article,
      isPlaying: true,
      duration: article.audio!.duration,
      currentTime: savedTime,
    }));
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !state.article) return;

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, state.duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
    }
  };

  const setPlaybackRate = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setState(prev => ({ ...prev, playbackRate: rate }));
  };

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState(prev => ({ ...prev, article: null, isPlaying: false }));
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        state,
        playArticle,
        togglePlayPause,
        seekTo,
        setPlaybackRate,
        closePlayer,
        skipForward,
        skipBackward,
        audioRef
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
