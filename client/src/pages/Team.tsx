import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  parseTeam,
  parseTeamUrl,
  teamToUrl,
  emptyTeam,
  teamCoverage,
  typeChartSchema,
  type Team as TeamData,
} from '@shared/team';
import { useCatalogue, fetchJson } from '@/lib/pokemonData';
import { useUrlState } from '@/lib/urlState';
import { AppShell, RequestState } from '@/components/AppShell';
import { PokemonSelector } from '@/components/PokemonSelector';
import { PokemonImage } from '@/components/PokemonImage';
import { TypeBadge } from '@/components/TypeBadge';

export default function Team() {
  const catalogue = useCatalogue(),
    [params, setParams] = useUrlState('/team');
  const [message, setMessage] = useState(''),
    [importError, setImportError] = useState(''),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  let team: TeamData = emptyTeam,
    linkError = '';
  try {
    team = parseTeamUrl(params.get('team'));
  } catch {
    linkError =
      'This team link is invalid. Clear the team to start again, or import a valid team file.';
  }
  const records = catalogue.data?.pokemon ?? [],
    byId = new Map(records.map((p) => [p.speciesId, p]));
  const resolved = team.slots.map((id) =>
      id === null ? undefined : byId.get(id),
    ),
    members = resolved.filter((p) => p !== undefined);
  const occupied = team.slots.filter((id) => id !== null).length,
    missing = occupied - members.length;
  const chart = useQuery({
    queryKey: ['type-chart'],
    queryFn: async ({ signal }) =>
      typeChartSchema.parse(await fetchJson('type-chart.json', signal)),
  });
  const update = (next: TeamData) => {
    setParams({ team: teamToUrl(next) });
    setMessage('');
    setImportError('');
  };
  const select = (index: number, id: string) => {
    const slots = [...team.slots];
    slots[index] = id ? Number(id) : null;
    update({ schemaVersion: 1, slots });
  };
  const exportTeam = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(team, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pokemonpedia-team.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importTeam = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setMessage('');
    setImportError('');
    try {
      if (file.size > 10000)
        throw new Error('Team files must be smaller than 10 KB.');
      update(parseTeam(await file.text()));
      setMessage('Team imported. All six slots were restored.');
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'This team could not be imported.',
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const shareUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#/team?team=${teamToUrl(team)}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Team link copied.');
    } catch {
      setMessage('Copy the team link from the field below.');
    }
  };
  const coverage = chart.data ? teamCoverage(chart.data, members) : [];
  return (
    <AppShell>
      <div className="page-heading">
        <h1>Build a Pokémon team</h1>
        <p className="muted">
          Choose up to six Pokémon and inspect their defensive type matchups.
        </p>
      </div>
      <p className="muted">
        Duplicate selections are allowed and count as separate slots. Your team
        is saved in this page’s URL; bookmark or share it to return to the same
        lineup.
      </p>
      <div className="team-actions summary-actions">
        <button
          className="action secondary"
          disabled={!occupied && !linkError}
          onClick={() => update(emptyTeam)}
        >
          Clear team
        </button>
        <button
          className="action secondary"
          disabled={Boolean(linkError)}
          onClick={copyLink}
        >
          Copy team link
        </button>
        <button
          className="action secondary"
          disabled={Boolean(linkError)}
          onClick={exportTeam}
        >
          Export team
        </button>
        <button
          className="action secondary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? 'Importing…' : 'Import team'}
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Team JSON file"
          onChange={(event) => void importTeam(event.target.files?.[0])}
        />
      </div>
      <label className="team-share-label" htmlFor="team-share">
        Shareable team link
      </label>
      <input
        id="team-share"
        className="team-share"
        value={shareUrl}
        readOnly
        onFocus={(event) => event.target.select()}
      />
      {message && (
        <p className="team-message" role="status">
          {message}
        </p>
      )}
      {(linkError || importError) && (
        <p className="team-message" role="alert">
          {linkError || importError}
        </p>
      )}
      <RequestState
        loading={catalogue.isPending}
        error={catalogue.isError}
        retry={() => void catalogue.refetch()}
      />
      <p className="team-count" role="status">
        {occupied} of 6 slots selected
        {missing && catalogue.isSuccess
          ? ` · ${missing} unavailable in this snapshot`
          : ''}
      </p>
      <div className="team-slots">
        {team.slots.map((id, index) => {
          const pokemon = resolved[index];
          return (
            <section
              className="team-slot"
              key={index}
              aria-label={`Team slot ${index + 1}`}
            >
              <h2>Slot {index + 1}</h2>
              <PokemonSelector
                label={`Slot ${index + 1} Pokémon`}
                records={records}
                value={id === null ? '' : String(id)}
                onChange={(value) => select(index, value)}
                disabled={!catalogue.isSuccess || Boolean(linkError)}
              />
              {pokemon ? (
                <Link
                  className="team-member"
                  href={`/pokemon/${pokemon.speciesId}`}
                  aria-label={`View slot ${index + 1} ${pokemon.name} details`}
                >
                  <PokemonImage src={pokemon.imageUrl} name={pokemon.name} />
                  <h3>{pokemon.name}</h3>
                  <div className="badge-row">
                    {pokemon.types.map((type) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  </div>
                </Link>
              ) : id && catalogue.isSuccess ? (
                <p className="muted">
                  Pokémon #{id} is unavailable. Clear or replace this slot.
                </p>
              ) : (
                <p className="muted team-empty">Empty slot</p>
              )}
            </section>
          );
        })}
      </div>
      <section className="team-coverage">
        <h2>Defensive type coverage</h2>
        <p className="muted">
          Standard type chart for Generation VI onward. Multipliers combine both
          defensive types. Abilities, held items, moves, and Terastallization
          are excluded; this does not predict battle outcomes.
        </p>
        {chart.isPending && (
          <p role="status" className="team-message">
            Loading the saved type chart…
          </p>
        )}
        {chart.isError && (
          <div role="alert" className="request-state">
            <p>
              The saved type chart could not be loaded. Your team selections are
              still available.
            </p>
            <button className="action" onClick={() => void chart.refetch()}>
              Retry type chart
            </button>
          </div>
        )}
        {chart.isSuccess && members.length === 0 && (
          <p className="request-state">
            Choose a Pokémon available in this snapshot to see its coverage.
          </p>
        )}
        {chart.data && members.length > 0 && (
          <>
            <p className="team-message">
              Analyzing {members.length} selected slots
              {missing ? `; ${missing} unavailable slots are excluded` : ''}. 0×
              immune · ¼× or ½× resists · 1× neutral · 2× or 4× weak.
            </p>
            <div
              className="table-scroll"
              role="region"
              aria-label="Defensive type coverage table"
              tabIndex={0}
            >
              <table className="coverage-table">
                <caption className="sr-only">
                  Damage multiplier from each attacking type, with counts of
                  weak, resistant, and immune team slots.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Attacking type</th>
                    {resolved.map(
                      (pokemon, index) =>
                        pokemon && (
                          <th scope="col" key={index}>
                            Slot {index + 1}
                            <br />
                            {pokemon.name}
                          </th>
                        ),
                    )}
                    <th scope="col">Weak</th>
                    <th scope="col">Resists</th>
                    <th scope="col">Immune</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((row) => (
                    <tr key={row.attack}>
                      <th scope="row">
                        <TypeBadge type={row.attack} />
                      </th>
                      {row.multipliers.map((n, index) => (
                        <td
                          key={index}
                          className={
                            n === 0
                              ? 'coverage-immune'
                              : n > 1
                                ? 'coverage-weak'
                                : n < 1
                                  ? 'coverage-resist'
                                  : ''
                          }
                        >
                          {n === 0.25 ? '¼' : n === 0.5 ? '½' : n}×
                        </td>
                      ))}
                      <td>{row.weak}</td>
                      <td>{row.resist}</td>
                      <td>{row.immune}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
