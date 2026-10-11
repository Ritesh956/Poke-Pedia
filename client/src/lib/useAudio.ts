import { useEffect, useRef, useState } from 'react';
let active: HTMLAudioElement | null = null;
export function useAudio({ src }: { src: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'playing' | 'error'
  >('idle');
  useEffect(() => {
    setStatus('idle');
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const audio = audioRef.current;
      if (audio) {
        audio.onplaying = audio.onended = audio.onpause = audio.onerror = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        if (active === audio) active = null;
        audioRef.current = null;
      }
    };
  }, [src]);
  const play = async () => {
    if (!src || status === 'loading') return;
    if (status === 'playing') {
      audioRef.current?.pause();
      setStatus('idle');
      return;
    }
    if (active) active.pause();
    const audio = audioRef.current ?? new Audio(src);
    audioRef.current = audio;
    active = audio;
    audio.volume = 0.5;
    audio.currentTime = 0;
    setStatus('loading');
    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    audio.onplaying = () => {
      clear();
      setStatus('playing');
    };
    audio.onended = audio.onpause = () => {
      clear();
      setStatus('idle');
    };
    audio.onerror = () => {
      clear();
      setStatus('error');
    };
    timerRef.current = setTimeout(() => {
      audio.pause();
      setStatus('error');
    }, 10000);
    try {
      await audio.play();
    } catch {
      clear();
      if (audioRef.current === audio) setStatus('error');
    }
  };
  return { play, status };
}
