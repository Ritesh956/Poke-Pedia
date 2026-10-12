import { statNames } from '@shared/schema';
import { displayName } from '@shared/pokemon';
import { useCatalogue } from '@/lib/pokemonData';
import { useUrlState } from '@/lib/urlState';
import { AppShell, RequestState } from '@/components/AppShell';
import { PokemonSelector } from '@/components/PokemonSelector';
import { PokemonSummary } from '@/components/PokemonSummary';
export default function Compare() {
  const query = useCatalogue(),
    [params, setParams] = useUrlState('/compare');
  const records = query.data?.pokemon ?? [],
    first = params.get('first') ?? '',
    second = params.get('second') ?? '';
  const pokemon1 = records.find((p) => String(p.speciesId) === first),
    pokemon2 = records.find((p) => String(p.speciesId) === second);
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <h1>Compare Pokémon</h1>
          <p className="muted">
            Choose two entries to compare their measurements, abilities, and
            base stats.
          </p>
        </div>
      </div>
      <RequestState
        loading={query.isPending}
        error={query.isError}
        retry={() => void query.refetch()}
      />
      <div className="comparison-grid">
        <PokemonSelector
          label="First Pokémon"
          records={records}
          value={first}
          onChange={(first) => setParams({ first })}
          disabled={!query.isSuccess}
        />
        <PokemonSelector
          label="Second Pokémon"
          records={records}
          value={second}
          onChange={(second) => setParams({ second })}
          disabled={!query.isSuccess}
        />
      </div>
      <div className="summary-actions">
        <button
          className="action secondary"
          disabled={!first && !second}
          onClick={() => setParams({ first: second, second: first })}
        >
          Swap
        </button>
        <button
          className="action secondary"
          disabled={!first && !second}
          onClick={() => setParams({ first: null, second: null })}
        >
          Clear both
        </button>
      </div>
      {((first && !pokemon1) || (second && !pokemon2)) && query.isSuccess && (
        <p role="status">
          One of these selections is not included in this snapshot. Choose
          another Pokémon.
        </p>
      )}
      {pokemon1 && pokemon2 ? (
        <>
          <div className="stat-comparison">
            <h2>Base stat comparison</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Stat</th>
                    <th scope="col">{pokemon1.name}</th>
                    <th scope="col">{pokemon2.name}</th>
                    <th scope="col">Difference (first − second)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...statNames, 'total' as const].map((name) => {
                    const a =
                        name === 'total'
                          ? statNames.reduce((n, s) => n + pokemon1.stats[s], 0)
                          : pokemon1.stats[name],
                      b =
                        name === 'total'
                          ? statNames.reduce((n, s) => n + pokemon2.stats[s], 0)
                          : pokemon2.stats[name];
                    return (
                      <tr key={name}>
                        <th scope="row">{displayName(name)}</th>
                        <td>{a}</td>
                        <td>{b}</td>
                        <td>
                          {a - b > 0 ? '+' : ''}
                          {a - b}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted">
              Base stats alone do not predict battle outcomes.
            </p>
          </div>
          <div className="comparison-grid">
            <PokemonSummary pokemon={pokemon1} />
            <PokemonSummary pokemon={pokemon2} />
          </div>
        </>
      ) : (
        !query.isError &&
        !query.isPending && (
          <p className="request-state">
            Select two Pokémon to compare them side by side.
          </p>
        )
      )}
    </AppShell>
  );
}
