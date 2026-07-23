'use client';

import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { 
  Play, 
  Pause, 
  X, 
  RotateCcw, 
  RotateCw,
  Volume2
} from 'lucide-react';
import Image from 'next/image';
import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function GlobalMiniPlayer() {
  const { 
    state: { article, isPlaying, progress, currentTime, duration, playbackRate },
    togglePlayPause,
    closePlayer,
    seekTo,
    setPlaybackRate,
    skipBackward,
    skipForward
  } = useAudioPlayer();

  const progressBarRef = useRef<HTMLDivElement>(null);

  if (!article) return null;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    seekTo(percentage * duration);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-full duration-300">
      {/* Progress Bar Container */}
      <div 
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        className="h-1.5 w-full bg-zinc-900 cursor-pointer group relative"
      >
        <div 
          className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
        {/* Hover area expansion for easier clicking */}
        <div className="absolute -top-2 -bottom-2 left-0 right-0" />
      </div>

      <div className="bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-xl px-4 py-3 md:px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Track Info */}
          <div className="flex items-center gap-4 w-full md:w-1/3 min-w-0">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-900 hidden md:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={article.cover} 
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <h4 className="text-sm font-bold text-white truncate">
                {article.title}
              </h4>
              <p className="text-xs text-zinc-400 truncate">
                {article.author}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center justify-center w-full md:w-1/3">
            <div className="flex items-center gap-6">
              <button 
                onClick={skipBackward}
                className="text-zinc-400 hover:text-white transition-colors p-2"
                aria-label="Voltar 15 segundos"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              <button 
                onClick={togglePlayPause}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-transform active:scale-95"
                aria-label={isPlaying ? "Pausar" : "Tocar"}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>

              <button 
                onClick={skipForward}
                className="text-zinc-400 hover:text-white transition-colors p-2"
                aria-label="Avançar 15 segundos"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Time & Extra Controls */}
          <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-1/3">
            <div className="text-xs font-medium text-zinc-400 w-24 text-center tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={cyclePlaybackRate}
                className="text-xs font-bold text-zinc-400 hover:text-emerald-400 transition-colors bg-zinc-900 px-2 py-1 rounded w-12 text-center"
              >
                {playbackRate}x
              </button>

              <button 
                onClick={closePlayer}
                className="text-zinc-500 hover:text-white transition-colors p-2"
                aria-label="Fechar player"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
