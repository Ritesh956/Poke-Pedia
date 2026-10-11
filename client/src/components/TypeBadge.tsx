import { typeColors, type PokemonType } from '@shared/schema';
import { badgeTextColor } from '@shared/pokemon';
export function TypeBadge({ type }: { type: PokemonType }) {
  return (
    <span
      className="type-badge"
      style={{ backgroundColor: typeColors[type], color: badgeTextColor(type) }}
    >
      {type}
    </span>
  );
}
