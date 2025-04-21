import { useState, useEffect, useCallback } from 'react';
import { Howl } from 'howler';

interface UseAudioProps {
  src: string;
  volume?: number;
  preload?: boolean;
}

export const useAudio = ({ src, volume = 0.5, preload = false }: UseAudioProps) => {
  const [sound, setSound] = useState<Howl | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const howl = new Howl({
      src: [src],
      volume,
      preload,
      html5: true, // Better for streaming
      onload: () => {
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

    setSound(howl);

    // Cleanup on unmount
    return () => {
      if (howl) {
        howl.unload();
      }
    };
  }, [src, volume, preload]);

  const play = useCallback(() => {
    if (sound && !isPlaying) {
      try {
        sound.play();
      } catch (err) {
        setError(`Error playing sound: ${err}`);
      }
    }
  }, [sound, isPlaying]);

  const stop = useCallback(() => {
    if (sound && isPlaying) {
      sound.stop();
    }
  }, [sound, isPlaying]);

  const pause = useCallback(() => {
    if (sound && isPlaying) {
      sound.pause();
    }
  }, [sound, isPlaying]);

  return {
    play,
    stop,
    pause,
    isLoaded,
    isPlaying,
    error
  };
};
