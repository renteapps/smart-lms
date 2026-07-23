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
  playArticle: (article: Article) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  closePlayer: () => void;
  skipForward: () => void;
  skipBackward: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

const STORAGE_KEY = 'smart_lms_audio_progress';

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

  // Initialize audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setState(prev => {
        const newTime = audio.currentTime;
        const progress = audio.duration ? newTime / audio.duration : 0;
        
        // Save progress to local storage periodically (every 5 seconds)
        if (Math.floor(newTime) % 5 === 0 && prev.article) {
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
    const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }));

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
    };
  }, []);

  const saveProgress = (slug: string, time: number) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || '{}';
      const parsed = JSON.parse(stored);
      parsed[slug] = time;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
      console.error('Failed to save audio progress', e);
    }
  };

  const getSavedProgress = (slug: string): number => {
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
  };

  const playArticle = (article: Article) => {
    if (!article.audio) return;
    
    if (state.article?.slug === article.slug) {
      // Toggle if it's the same article
      togglePlayPause();
      return;
    }

    const savedTime = getSavedProgress(article.slug);
    
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
        skipBackward
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
