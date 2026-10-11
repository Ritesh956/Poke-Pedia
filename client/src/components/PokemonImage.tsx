import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
export function PokemonImage({
  src,
  name,
  className = '',
  fallbackSrc = null,
  fallbackName,
}: {
  src: string | null;
  name: string;
  className?: string;
  fallbackSrc?: string | null;
  fallbackName?: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const current = [src, fallbackSrc].find(
    (candidate) => candidate && !failed.includes(candidate),
  );
  return current ? (
    <img
      src={current}
      alt={current !== src && fallbackName ? fallbackName : name}
      width={240}
      height={240}
      className={`pokemon-image ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed((previous) => [...previous, current])}
    />
  ) : (
    <div
      role="img"
      aria-label={`Artwork unavailable for ${name}`}
      className={`pokemon-image image-fallback ${className}`}
    >
      <CircleHelp aria-hidden="true" />
      <span>Artwork unavailable</span>
    </div>
  );
}
