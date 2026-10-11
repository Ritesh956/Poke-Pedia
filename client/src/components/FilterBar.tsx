import { pokemonTypes, typeColors, type PokemonType } from '@shared/schema';
import { badgeTextColor, type Filters } from '@shared/pokemon';
export function FilterBar({
  filters,
  change,
}: {
  filters: Filters;
  change: (values: Record<string, string | null>) => void;
}) {
  const activeCount =
    Number(filters.type !== 'all') +
    Number(filters.legendary) +
    Number(filters.mythical) +
    Number(filters.baby);
  return (
    <details className="filter-panel">
      <summary>Filters{activeCount ? ` (${activeCount} active)` : ''}</summary>
      <fieldset>
        <legend>Pokémon type</legend>
        <div className="type-options">
          <button
            aria-pressed={filters.type === 'all'}
            className="type-filter"
            onClick={() => change({ type: null })}
          >
            All types
          </button>
          {pokemonTypes.map((type: PokemonType) => (
            <button
              key={type}
              className="type-filter"
              aria-pressed={filters.type === type}
              style={{
                backgroundColor: typeColors[type],
                color: badgeTextColor(type),
              }}
              onClick={() => change({ type })}
            >
              {type}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Special Pokémon</legend>
        <p className="muted">Matches any selected category.</p>
        <div className="special-options">
          {(['legendary', 'mythical', 'baby'] as const).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={filters[key]}
                onChange={(e) =>
                  change({ [key]: e.target.checked ? '1' : null })
                }
              />
              {key}
            </label>
          ))}
        </div>
      </fieldset>
    </details>
  );
}
