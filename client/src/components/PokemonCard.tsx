import { Link } from 'wouter';
import type { Pokemon } from '@shared/schema';
import { PokemonImage } from './PokemonImage';
import { TypeBadge } from './TypeBadge';
import { CollectionActions } from './CollectionActions';
export function PokemonCard({
  pokemon,
  layout,
}: {
  pokemon: Pokemon;
  layout: 'grid' | 'box' | 'list';
}) {
  return (
    <article className={`pokemon-card layout-${layout}`}>
      <Link
        href={`/pokemon/${pokemon.speciesId}`}
        className="card-link"
        aria-label={`View ${pokemon.name} details`}
      >
        <PokemonImage src={pokemon.imageUrl} name={pokemon.name} />
        <div className="card-info">
          <span className="pokemon-id">
            #{String(pokemon.speciesId).padStart(3, '0')}
          </span>
          <h3>{pokemon.name}</h3>
          <div className="badge-row">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
          {layout === 'box' && (
            <p className="card-preview">{pokemon.description}</p>
          )}
          <span className="details-link">View details</span>
        </div>
      </Link>
      <CollectionActions id={pokemon.speciesId} name={pokemon.name} />
    </article>
  );
}
