import { useState } from 'react';
import { displayName } from '@shared/pokemon';
import {
  gameMoves,
  gameEncounters,
  type ReferenceData,
  type Game,
} from '@shared/reference';
export function GameReference({
  data,
  varietyId,
  game,
}: {
  data: ReferenceData;
  varietyId: number;
  game: Game;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState({ query: '', limit: 40 });
  const limit = page.query === search ? page.limit : 40;
  const moves = gameMoves(data, varietyId, game.id).filter((move) =>
    displayName(move.name).toLowerCase().includes(search.trim().toLowerCase()),
  );
  const encounters = gameEncounters(data, varietyId, game),
    variety = data.varieties.find((item) => item.id === varietyId);
  return (
    <section className="game-reference">
      <h2>Reference for {displayName(game.slug)}</h2>
      <p className="muted">
        Moves and encounter locations apply to the selected variety and game
        group. Names below use English identifiers. Empty data does not
        establish whether this Pokémon is obtainable in that game. Base stats
        and types above describe the saved variety, not historical changes by
        game.
      </p>
      <h3>Move learning</h3>
      <label className="move-search">
        Find a move
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search move names…"
        />
      </label>
      <p role="status">{moves.length} move-learning records</p>
      {moves.length ? (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Move-learning records for {displayName(game.slug)}
            </caption>
            <thead>
              <tr>
                <th scope="col">Move</th>
                <th scope="col">Method</th>
                <th scope="col">Minimum level</th>
              </tr>
            </thead>
            <tbody>
              {moves.slice(0, limit).map((move, index) => (
                <tr key={`${move.name}-${move.method}-${move.level}-${index}`}>
                  <th scope="row">{displayName(move.name)}</th>
                  <td>{displayName(move.method)}</td>
                  <td>
                    {move.method === 'level-up' ? move.level : 'Not specified'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">
          {search
            ? 'No matching move records. Clear the search to see all saved moves.'
            : 'No saved move information for this variety and game group.'}
        </p>
      )}
      {moves.length > limit && (
        <button
          className="action secondary"
          onClick={() => setPage({ query: search, limit: limit + 40 })}
        >
          Load 40 more move records
        </button>
      )}
      <h3>Encounter locations</h3>
      {!variety?.encountersAvailable ? (
        <p className="muted">
          Encounter information is unavailable for this variety.
        </p>
      ) : !encounters.length ? (
        <p className="muted">
          No saved encounters for this variety and game group. This does not
          establish in-game availability.
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Encounters for {displayName(game.slug)}
            </caption>
            <thead>
              <tr>
                <th scope="col">Location</th>
                <th scope="col">Version</th>
                <th scope="col">Method</th>
                <th scope="col">Levels</th>
                <th scope="col">Conditions</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((encounter, index) => (
                <tr key={index}>
                  <th scope="row">{displayName(encounter.area)}</th>
                  <td>{displayName(encounter.version)}</td>
                  <td>{displayName(encounter.method)}</td>
                  <td>
                    {encounter.min}–{encounter.max}
                  </td>
                  <td>
                    {encounter.conditions.length
                      ? encounter.conditions.map(displayName).join(', ')
                      : 'None specified'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
