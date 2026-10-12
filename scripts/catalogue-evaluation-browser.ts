import { catalogueSchema, pokemonSchema } from '../shared/schema';
import { indexSchema } from './lib/catalogue-index';
import { filterPokemon } from '../shared/pokemon';

// Minimal data-path harness, deliberately separate from application UI timings.
const mode = new URLSearchParams(location.search).get('mode');
const cache = await caches.open(`evaluation-${mode}`);
async function load(file: string) {
  const url = `/data/${file}`;
  let response = await cache.match(url);
  if (!response) {
    response = await fetch(url);
    if (!response.ok) throw new Error(`Unavailable: ${file}`);
    await cache.put(url, response.clone());
  }
  return response.json();
}
const started = performance.now();
const records =
  mode === 'full'
    ? catalogueSchema.parse(await load('catalogue.json'))
    : indexSchema.parse(await load('index.json'));
document.body.replaceChildren(
  ...records.slice(0, 40).map((p) => {
    const element = document.createElement('article');
    element.textContent = `${p.speciesId} ${p.name} ${p.description}`;
    return element;
  }),
);
await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const readyMs = performance.now() - started;
const searchStarted = performance.now();
const result = filterPokemon(records, {
  query: '25',
  type: 'all',
  legendary: false,
  mythical: false,
  baby: false,
  sort: 'id',
});
if (result.length !== 1 || result[0].name !== 'Pikachu')
  throw new Error('Search mismatch');
const searchMs = performance.now() - searchStarted;
async function details(ids: number[]) {
  return Promise.all(
    ids.map(async (id) => {
      if (mode === 'full')
        return pokemonSchema.parse(records.find((p) => p.speciesId === id));
      const record = pokemonSchema.parse(await load(`details/${id}.json`));
      if (record.speciesId !== id) throw new Error('Incorrect detail identity');
      return record;
    }),
  );
}
Object.assign(window, {
  evaluation: {
    readyMs,
    searchMs,
    count: records.length,
    details,
    cached: () => cache.keys().then((keys) => keys.map((key) => key.url)),
  },
});
