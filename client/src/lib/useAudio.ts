import { useState, useEffect, useCallback, useRef } from 'react';
import { Howl } from 'howler';

interface UseAudioProps {
  src: string;
  volume?: number;
  preload?: boolean;
  timeout?: number; // Timeout in ms to wait for sound loading
}

export const useAudio = ({ 
  src, 
  volume = 0.5, 
  preload = false,
  timeout = 3000 // Default 3s timeout
}: UseAudioProps) => {
  const [sound, setSound] = useState<Howl | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soundRef = useRef<Howl | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any previous timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Reset error state when src changes
    setError(null);

    // Create new Howl instance
    const howl = new Howl({
      src: [src],
      volume,
      preload,
      html5: true, // Better for streaming
      format: ['mp3'],
      onload: () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
        setIsLoaded(true);
        setError(null);
      },
      onloaderror: (id, message) => {
        setError(`Error loading sound: ${message || 'Unknown error'}`);
        setIsLoaded(false);
      },
      onplay: () => {
        setIsPlaying(true);
      },
      onend: () => {
        setIsPlaying(false);
      },
      onstop: () => {
        setIsPlaying(false);
      },
      onpause: () => {
        setIsPlaying(false);
      }
    });

    // Set load timeout
    loadTimeoutRef.current = setTimeout(() => {
      if (!isLoaded) {
        setError(`Timeout loading sound: ${src}`);
        if (howl) {
          howl.unload();
        }
      }
    }, timeout);

    // Update states
    setSound(howl);
    soundRef.current = howl;

    // Cleanup on unmount or when src changes
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (howl) {
        howl.unload();
      }
    };
  }, [src, volume, preload, timeout]);

  const play = useCallback(() => {
    if (soundRef.current && !isPlaying) {
      try {
        soundRef.current.play();
      } catch (err) {
        setError(`Error playing sound: ${err}`);
      }
    }
  }, [isPlaying]);

  const stop = useCallback(() => {
    if (soundRef.current && isPlaying) {
      soundRef.current.stop();
    }
  }, [isPlaying]);

  const pause = useCallback(() => {
    if (soundRef.current && isPlaying) {
      soundRef.current.pause();
    }
  }, [isPlaying]);

  return {
    play,
    stop,
    pause,
    isLoaded,
    isPlaying,
    error
  };
};
