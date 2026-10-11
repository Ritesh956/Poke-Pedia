import { Link } from 'wouter';
import { Volume2, Square } from 'lucide-react';
import { statNames, type Pokemon } from '@shared/schema';
import { displayName } from '@shared/pokemon';
import { useAudio } from '@/lib/useAudio';
import { PokemonImage } from './PokemonImage';
import { TypeBadge } from './TypeBadge';
import { CollectionActions } from './CollectionActions';
export function PokemonSummary({
  pokemon,
  detail = false,
  shiny = false,
  nameLanguage,
  descriptionLanguage,
  game,
}: {
  pokemon: Pokemon;
  detail?: boolean;
  shiny?: boolean;
  nameLanguage?: string;
  descriptionLanguage?: string;
  game?: string;
}) {
  const { play, status } = useAudio({ src: pokemon.soundUrl });
  return (
    <section className="pokemon-summary" aria-label={pokemon.name}>
      <div className="summary-heading">
        <h2 lang={nameLanguage}>{pokemon.name}</h2>
        <span className="pokemon-id">
          #{String(pokemon.speciesId).padStart(3, '0')}
        </span>
      </div>
      <CollectionActions id={pokemon.speciesId} name={pokemon.name} />
      <PokemonImage
        src={
          shiny ? (pokemon.shinyImageUrl ?? pokemon.imageUrl) : pokemon.imageUrl
        }
        name={
          shiny && pokemon.shinyImageUrl
            ? `${pokemon.name} (shiny)`
            : pokemon.name
        }
        fallbackSrc={shiny ? pokemon.imageUrl : null}
        fallbackName={`${pokemon.name} (regular artwork fallback)`}
      />
      {shiny && !pokemon.shinyImageUrl && (
        <p role="status" className="muted">
          Shiny artwork is unavailable for this variety. Showing regular
          artwork.
        </p>
      )}
      <div className="badge-row">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
        {pokemon.isLegendary && <span className="status-badge">Legendary</span>}
        {pokemon.isMythical && <span className="status-badge">Mythical</span>}
        {pokemon.isBaby && <span className="status-badge">Baby</span>}
      </div>
      <p className="description" lang={descriptionLanguage}>
        {pokemon.description}
      </p>
      <dl className="measurements">
        <div>
          <dt>Height</dt>
          <dd>{pokemon.height} m</dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>{pokemon.weight} kg</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{pokemon.category}</dd>
        </div>
        <div>
          <dt>Generation</dt>
          <dd>{displayName(pokemon.generation)}</dd>
        </div>
        <div>
          <dt>{pokemon.isDefault ? 'Default variety' : 'Variety'}</dt>
          <dd>{pokemon.form}</dd>
        </div>
        <div>
          <dt>Abilities</dt>
          <dd>
            {pokemon.abilities.map((ability, i) => (
              <span key={ability}>
                {i > 0 ? ', ' : ''}
                {ability}
                {pokemon.hiddenAbilities.includes(ability) ? ' (hidden)' : ''}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <h3>Base stats</h3>
      <dl className="base-stats">
        {statNames.map((name) => (
          <div key={name}>
            <dt>{displayName(name)}</dt>
            <dd>{pokemon.stats[name]}</dd>
          </div>
        ))}
        <div className="stat-total">
          <dt>Total</dt>
          <dd>
            {statNames.reduce((sum, name) => sum + pokemon.stats[name], 0)}
          </dd>
        </div>
      </dl>
      <div className="summary-actions">
        <button
          className="action"
          onClick={() => void play()}
          disabled={!pokemon.soundUrl || status === 'loading'}
        >
          {status === 'playing' ? (
            <Square size={16} aria-hidden="true" />
          ) : (
            <Volume2 size={16} aria-hidden="true" />
          )}
          {!pokemon.soundUrl
            ? 'Cry unavailable'
            : status === 'loading'
              ? 'Loading cry…'
              : status === 'playing'
                ? 'Stop cry'
                : 'Play cry'}
        </button>
        {detail ? (
          <>
            <Link
              className="action secondary"
              href={`/compare?first=${pokemon.speciesId}`}
            >
              Compare
            </Link>
            <Link
              className="action secondary"
              href={`/evolution?pokemon=${pokemon.speciesId}${game ? `&game=${game}` : ''}`}
            >
              Evolution family
            </Link>
            <Link
              className="action secondary"
              href={`/team?team=${pokemon.speciesId},0,0,0,0,0`}
            >
              Start a team
            </Link>
          </>
        ) : (
          <Link
            className="action secondary"
            href={`/pokemon/${pokemon.speciesId}`}
          >
            Full details
          </Link>
        )}
      </div>
      {detail && !pokemon.isDefault && (
        <p className="muted">
          Comparison and team links use this species’ default variety.
        </p>
      )}
      {status === 'error' && (
        <p role="status" className="muted">
          This cry could not play. You can try Play cry again.
        </p>
      )}
    </section>
  );
}
