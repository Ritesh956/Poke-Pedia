import { useCallback, useState } from 'react';
import { pokemonTypes, type PokemonType } from '@shared/schema';
import { filterPokemon, type Filters } from '@shared/pokemon';
import { useCatalogue } from '@/lib/pokemonData';
import { useUrlState } from '@/lib/urlState';
import { AppShell, RequestState } from '@/components/AppShell';
import { SearchBar } from '@/components/SearchBar';
import { FilterBar } from '@/components/FilterBar';
import { PokemonGrid } from '@/components/PokemonGrid';
import { ViewToggle } from '@/components/ViewToggle';
import { CollectionTools } from '@/components/CollectionTools';
import { useCollection } from '@/lib/collection';
export default function Home() {
  const query = useCatalogue();
  const { collection } = useCollection();
  const [params, setParams] = useUrlState();
  const [page, setPage] = useState({ key: '', count: 40 });
  const filters: Filters = {
    query: params.get('q') ?? '',
    type: pokemonTypes.includes(params.get('type') as PokemonType)
      ? (params.get('type') as PokemonType)
      : 'all',
    legendary: params.get('legendary') === '1',
    mythical: params.get('mythical') === '1',
    baby: params.get('baby') === '1',
    sort: ['name', 'height', 'weight'].includes(params.get('sort') ?? '')
      ? (params.get('sort') as Filters['sort'])
      : 'id',
  };
  const layout = ['box', 'list'].includes(params.get('layout') ?? '')
    ? (params.get('layout') as 'box' | 'list')
    : 'grid';
  const change = useCallback(
    (values: Record<string, string | null>) => setParams(values),
    [setParams],
  );
  const search = useCallback(
    (q: string) => setParams({ q }, true),
    [setParams],
  );
  const reset = () =>
    setParams({
      q: null,
      type: null,
      legendary: null,
      mythical: null,
      baby: null,
      sort: null,
      layout: null,
      collection: null,
    });
  const collectionFilter = ['favorites', 'caught'].includes(
    params.get('collection') ?? '',
  )
    ? (params.get('collection') as 'favorites' | 'caught')
    : 'all';
  const records = filterPokemon(query.data?.pokemon ?? [], filters).filter(
      (p) =>
        collectionFilter === 'all' ||
        collection[collectionFilter].includes(p.speciesId),
    ),
    key = JSON.stringify([filters, collectionFilter]),
    visible = page.key === key ? page.count : 40;
  const hasFilters =
    filters.query ||
    filters.type !== 'all' ||
    filters.legendary ||
    filters.mythical ||
    filters.baby ||
    collectionFilter !== 'all';
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <h1>Explore the Pokédex</h1>
          <p className="muted">
            Find a Pokémon, compare its stats, and discover its evolution
            family.
          </p>
        </div>
      </div>
      <SearchBar value={filters.query} onSearch={search} />
      <FilterBar filters={filters} change={change} />
      <div
        className="collection-filter"
        role="group"
        aria-label="Collection view"
      >
        {(['all', 'favorites', 'caught'] as const).map((view) => (
          <button
            key={view}
            className="action secondary"
            aria-pressed={collectionFilter === view}
            onClick={() => change({ collection: view === 'all' ? null : view })}
          >
            {view === 'all'
              ? 'All Pokémon'
              : view === 'favorites'
                ? 'Favorites'
                : 'Caught'}
          </button>
        ))}
      </div>
      <div className="catalogue-toolbar">
        <div className="toolbar-controls">
          <ViewToggle
            layout={layout}
            setLayout={(layout) => change({ layout })}
          />
          <label className="sort-label">
            Sort
            <select
              value={filters.sort}
              onChange={(e) => change({ sort: e.target.value })}
            >
              <option value="id">Pokédex number</option>
              <option value="name">Name</option>
              <option value="height">Height</option>
              <option value="weight">Weight</option>
            </select>
          </label>
        </div>
        <p role="status">
          {query.isPending
            ? 'Loading Pokémon…'
            : query.isError
              ? 'Catalogue unavailable'
              : `${records.length} Pokémon`}
          {hasFilters && (
            <button className="text-action" onClick={reset}>
              Clear all filters
            </button>
          )}
        </p>
      </div>
      {hasFilters && (
        <p className="active-filters muted">
          Active:{' '}
          {[
            filters.query && `Search “${filters.query}”`,
            filters.type !== 'all' && filters.type,
            filters.legendary && 'Legendary',
            filters.mythical && 'Mythical',
            filters.baby && 'Baby',
            collectionFilter !== 'all' && collectionFilter,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      <RequestState
        loading={false}
        error={query.isError}
        retry={() => void query.refetch()}
      />
      {query.data?.manifest.missingIds.length ? (
        <p role="status">
          This snapshot includes {query.data.manifest.recordCount} of{' '}
          {query.data.manifest.expectedCount} species. Some entries are
          unavailable.
        </p>
      ) : null}
      {!query.isError && (
        <PokemonGrid
          pokemons={records.slice(0, visible)}
          isLoading={query.isPending}
          layout={layout}
        />
      )}
      {!query.isPending && !query.isError && records.length === 0 && (
        <button className="action" onClick={reset}>
          Clear all filters
        </button>
      )}
      {records.length > visible && (
        <div className="load-more">
          <p className="muted">
            Showing {visible} of {records.length}
          </p>
          <button
            className="action"
            onClick={() => setPage({ key, count: visible + 40 })}
          >
            Load 40 more
          </button>
        </div>
      )}
      {query.data && (
        <p className="snapshot-note muted">
          {query.data.manifest.recordCount} species · Default varieties ·
          Updated{' '}
          {new Date(query.data.manifest.generatedAt).toLocaleDateString()} ·
          Snapshot {query.data.manifest.version.slice(0, 8)}
        </p>
      )}
      <CollectionTools />
    </AppShell>
  );
}
