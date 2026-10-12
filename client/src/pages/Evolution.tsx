import { Link } from 'wouter';
import type { EvolutionNode, Pokemon } from '@shared/schema';
import { useCatalogue, useEvolution } from '@/lib/pokemonData';
import { useUrlState } from '@/lib/urlState';
import { AppShell, RequestState } from '@/components/AppShell';
import { PokemonSelector } from '@/components/PokemonSelector';
import { PokemonImage } from '@/components/PokemonImage';
import { TypeBadge } from '@/components/TypeBadge';
import { conditionsForGame } from '@shared/reference';
import { displayName } from '@shared/pokemon';
function Branch({
  node,
  records,
  selected,
  game,
}: {
  node: EvolutionNode;
  records: Map<number, Pokemon>;
  selected: number;
  game?: string;
}) {
  const pokemon = records.get(node.speciesId);
  const rules = conditionsForGame(node.conditions, game);
  return (
    <li className="evolution-branch">
      <div
        className={`evolution-member ${selected === node.speciesId ? 'selected-member' : ''}`}
      >
        {pokemon ? (
          <Link className="evolution-link" href={`/pokemon/${node.speciesId}`}>
            <PokemonImage src={pokemon.imageUrl} name={pokemon.name} />
            <span className="pokemon-id">
              #{String(node.speciesId).padStart(3, '0')}
            </span>
            <h3>{pokemon.name}</h3>
            <div className="badge-row">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          </Link>
        ) : (
          <>
            <h3>{node.name}</h3>
            <p className="muted">Details unavailable in this snapshot.</p>
          </>
        )}
        {node.conditions.length > 0 && (
          <details className="evolution-conditions">
            <summary>
              Evolution conditions
              {rules.conditions.length > 1
                ? ` (${rules.conditions.length} alternatives)`
                : ''}
            </summary>
            <span className="muted">Evolves from its parent with</span>
            {game && !rules.specific && (
              <p className="muted">
                No rules specific to {displayName(game)} are saved for this
                edge; showing all source alternatives.
              </p>
            )}
            {rules.conditions.map((conditions, i) => (
              <p key={i}>
                {i > 0 && <strong>OR </strong>}
                {conditions.length
                  ? conditions.join(' · ')
                  : 'Conditions unavailable'}
              </p>
            ))}
          </details>
        )}
      </div>
      {node.children.length > 0 && (
        <ul
          aria-label={`Evolutions of ${node.name}`}
          className="evolution-children"
        >
          {node.children.map((child) => (
            <Branch
              key={child.speciesId}
              node={child}
              records={records}
              selected={selected}
              game={game}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
export default function Evolution() {
  const catalogue = useCatalogue(),
    [params, setParams] = useUrlState('/evolution'),
    selectedId = params.get('pokemon') ?? '';
  const records = catalogue.data?.pokemon ?? [],
    selected = records.find((p) => String(p.speciesId) === selectedId);
  const family = useEvolution(
    catalogue.data?.manifest,
    selected?.evolutionChainId,
  );
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <h1>Evolution families</h1>
          <p className="muted">
            Follow each branch from its first stage. Siblings are separate
            evolutions.
          </p>
        </div>
      </div>
      <RequestState
        loading={catalogue.isPending}
        error={catalogue.isError}
        retry={() => void catalogue.refetch()}
      />
      <div className="evolution-selector">
        <PokemonSelector
          label="Pokémon"
          records={records}
          value={selectedId}
          onChange={(pokemon) => setParams({ pokemon })}
          disabled={!catalogue.isSuccess}
        />
      </div>
      <div className="example-families">
        <span className="muted">Try a family:</span>
        {[
          [1, 'Bulbasaur'],
          [172, 'Pichu'],
          [133, 'Eevee'],
        ].map(([id, name]) => (
          <button
            key={id}
            className="action secondary"
            disabled={!catalogue.isSuccess}
            onClick={() => setParams({ pokemon: String(id) })}
          >
            {name}
          </button>
        ))}
      </div>
      {!selectedId && catalogue.isSuccess && (
        <p className="request-state">
          Choose a Pokémon to explore its evolution family.
        </p>
      )}
      {selectedId && !selected && catalogue.isSuccess && (
        <p role="status">
          This Pokémon is not included in the saved catalogue.
        </p>
      )}
      {selected && !selected.evolutionChainId && (
        <p role="status">Evolution data is unavailable for this Pokémon.</p>
      )}
      {selected?.evolutionChainId && family.isPending && (
        <p role="status">Loading the evolution family…</p>
      )}
      {selected && family.isError && (
        <div role="alert" className="request-state">
          <p>This evolution family could not be loaded.</p>
          <button className="action" onClick={() => void family.refetch()}>
            Retry family
          </button>
        </div>
      )}
      {selected && family.data && (
        <section className="family-section">
          <h2>{family.data.name} family</h2>
          <p className="muted">
            Conditions are supplied by PokéAPI across games; requirements can
            differ by game version.
            {params.get('game') &&
              ` Selected rules context: ${displayName(params.get('game')!)}. The canonical family includes species from multiple generations; this does not establish availability in the selected game.`}
          </p>
          {family.data.children.length === 0 && (
            <p>This is a single stage family with no further evolutions.</p>
          )}
          <ul className="evolution-tree">
            <Branch
              node={family.data}
              records={new Map(records.map((p) => [p.speciesId, p]))}
              selected={selected.speciesId}
              game={params.get('game') ?? undefined}
            />
          </ul>
        </section>
      )}
    </AppShell>
  );
}
