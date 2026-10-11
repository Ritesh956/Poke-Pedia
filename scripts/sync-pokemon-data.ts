import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  catalogueSchema,
  manifestSchema,
  evolutionNodeSchema,
  type Pokemon,
} from '../shared/schema';
import {
  normalizePokemon,
  normalizeEvolution,
  upstreamSpecies,
} from '../shared/pokemon';
import { publishSnapshot } from './lib/publish-snapshot';
import { cachedGet } from './lib/upstream';
const root = path.resolve('client/public/data'),
  cache = path.resolve('.cache/pokeapi');
const force = process.argv.includes('--refresh'),
  limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
if (limit !== null && (!Number.isSafeInteger(limit) || limit < 1))
  throw new Error('Limit must be a positive integer');
await mkdir(cache, { recursive: true });
const lockPath = path.join(cache, 'sync.lock');
const lock = await open(lockPath, 'wx').catch(() => {
  throw new Error(
    'Another data refresh is running. Remove .cache/pokeapi/sync.lock only if that process has stopped.',
  );
});
async function fetchResource(url: string): Promise<unknown> {
  return cachedGet(url, cache, force);
}
async function pool<T, U>(
  items: T[],
  fn: (item: T) => Promise<U>,
): Promise<U[]> {
  const output: U[] = new Array(items.length);
  let cursor = 0;
  const workers = await Promise.allSettled(
    Array.from({ length: Math.min(6, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        output[i] = await fn(items[i]);
      }
    }),
  );
  const failed = workers.find(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  );
  if (failed) throw failed.reason;
  return output;
}
try {
  const listSchema = z.object({
    count: z.number().int().positive(),
    next: z.string().url().nullable(),
    results: z.array(z.object({ name: z.string(), url: z.string().url() })),
  });
  const species: { name: string; url: string }[] = [];
  let next: string | null =
      'https://pokeapi.co/api/v2/pokemon-species?limit=200',
    expectedCount = 0;
  while (next) {
    const page = listSchema.parse(await fetchResource(next));
    expectedCount = page.count;
    species.push(...page.results);
    next = page.next;
  }
  if (species.length !== expectedCount)
    throw new Error('Incomplete species index');
  const chosen = limit ? species.slice(0, limit) : species;
  console.log(
    `Preparing ${chosen.length} default varieties (${expectedCount} species in upstream index).`,
  );
  let completed = 0;
  const records = await pool(chosen, async ({ url }): Promise<Pokemon> => {
    const s = upstreamSpecies.parse(await fetchResource(url)),
      variety = s.varieties.find((v) => v.is_default);
    if (!variety)
      throw new Error(`Missing default variety for species ${s.id}`);
    const record = normalizePokemon(
      await fetchResource(variety.pokemon.url),
      s,
    );
    if (++completed % 100 === 0)
      console.log(`Validated ${completed}/${chosen.length}`);
    return record;
  });
  records.sort((a, b) => a.speciesId - b.speciesId);
  catalogueSchema.parse(records);
  const chains = [
    ...new Set(
      records.flatMap((p) => (p.evolutionChainId ? [p.evolutionChainId] : [])),
    ),
  ];
  console.log(`Preparing ${chains.length} evolution families.`);
  const families = await pool(chains, async (id) => ({
    id,
    tree: evolutionNodeSchema.parse(
      normalizeEvolution(
        await fetchResource(`https://pokeapi.co/api/v2/evolution-chain/${id}/`),
      ),
    ),
  }));
  const serialized = JSON.stringify(records),
    version = createHash('sha256')
      .update(serialized + JSON.stringify(families))
      .digest('hex')
      .slice(0, 16);
  const missingIds = species
    .slice(chosen.length)
    .map((s) => Number(s.url.split('/').filter(Boolean).at(-1)));
  const manifest = manifestSchema.parse({
    schemaVersion: 1,
    version,
    generatedAt: new Date().toISOString(),
    expectedCount,
    recordCount: records.length,
    missingIds,
    generations: [...new Set(records.map((p) => p.generation))],
    scope: 'default varieties',
  });
  await publishSnapshot(root, records, families, manifest);
  console.log(
    `Published snapshot ${version}: ${records.length} entries. Previous snapshot remains available.`,
  );
} finally {
  await lock.close();
  await unlink(lockPath);
}
