import {
  mkdir,
  readFile,
  writeFile,
  rename,
  access,
  open,
  unlink,
} from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { catalogueSchema, manifestSchema } from '../shared/schema';
import {
  referenceSchema,
  referenceManifestSchema,
  gameSchema,
  languages,
  type ReferenceData,
} from '../shared/reference';
import { cachedGet } from './lib/upstream';
import { renameWithRetry } from './lib/rename';
import { resourceId } from '../shared/pokemon';
const root = path.resolve('client/public/data'),
  cache = path.resolve('.cache/pokeapi');
await mkdir(cache, { recursive: true });
const lockPath = path.join(cache, 'sync.lock'),
  lock = await open(lockPath, 'wx').catch(() => {
    throw new Error('Another refresh is running. Wait for it to finish.');
  });
const named = z.object({ name: z.string(), url: z.string().url().optional() });
const rawSpecies = z.object({
  id: z.number().int().positive(),
  names: z.array(z.object({ name: z.string(), language: named })),
  flavor_text_entries: z.array(
    z.object({ flavor_text: z.string(), language: named, version: named }),
  ),
  varieties: z.array(
    z.object({ pokemon: z.object({ url: z.string().url() }) }),
  ),
});
const rawPokemon = z.object({
  id: z.number().int().positive(),
  species: z.object({ url: z.string().url() }),
  moves: z.array(
    z.object({
      move: named,
      version_group_details: z.array(
        z.object({
          version_group: named,
          move_learn_method: named,
          level_learned_at: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
});
const rawEncounters = z.array(
  z.object({
    location_area: named,
    version_details: z.array(
      z.object({
        version: named,
        encounter_details: z.array(
          z.object({
            method: named,
            min_level: z.number().int().nonnegative(),
            max_level: z.number().int().nonnegative(),
            condition_values: z.array(named),
          }),
        ),
      }),
    ),
  }),
);
try {
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')),
  );
  const records = catalogueSchema.parse(
    JSON.parse(
      await readFile(
        path.join(root, manifest.version, 'catalogue.json'),
        'utf8',
      ),
    ),
  );
  const list = z.object({
    results: z.array(z.object({ url: z.string().url() })),
    next: z.string().url().nullable(),
  });
  const games = [];
  let next: string | null = 'https://pokeapi.co/api/v2/version-group?limit=100';
  while (next) {
    const page = list.parse(
      await cachedGet(next, cache, process.argv.includes('--refresh')),
    );
    next = page.next;
    for (const resource of page.results) {
      const raw = z
        .object({
          id: z.number().int().positive(),
          name: z.string(),
          versions: z.array(named),
        })
        .parse(
          await cachedGet(
            resource.url,
            cache,
            process.argv.includes('--refresh'),
          ),
        );
      games.push(
        gameSchema.parse({
          id: raw.id,
          slug: raw.name,
          versions: raw.versions.map((version) => version.name),
        }),
      );
    }
  }
  const gameIds = new Map(games.map((game) => [game.slug, game.id]));
  const data: ReferenceData[] = new Array(records.length);
  let cursor = 0,
    done = 0;
  const jobs = await Promise.allSettled(
    Array.from({ length: 6 }, async () => {
      while (cursor < records.length) {
        const index = cursor++,
          id = records[index].speciesId;
        const species = rawSpecies.parse(
          await cachedGet(
            `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
            cache,
            process.argv.includes('--refresh'),
          ),
        );
        if (species.id !== id) throw new Error('Wrong reference species');
        const varieties = [];
        for (const variety of species.varieties) {
          const pokemon = rawPokemon.parse(
            await cachedGet(
              variety.pokemon.url,
              cache,
              process.argv.includes('--refresh'),
            ),
          );
          if (
            pokemon.id !== resourceId(variety.pokemon.url) ||
            resourceId(pokemon.species.url) !== id
          )
            throw new Error('Reference variety identity mismatch');
          const moves = pokemon.moves.map((move) => ({
            name: move.move.name,
            learns: move.version_group_details.map((detail) => {
              const group = gameIds.get(detail.version_group.name);
              if (!group) throw new Error('Unknown move version group');
              return [
                group,
                detail.move_learn_method.name,
                detail.level_learned_at,
              ] as [number, string, number];
            }),
          }));
          let available = true,
            encounters: z.infer<typeof rawEncounters> = [];
          try {
            encounters = rawEncounters.parse(
              await cachedGet(
                `https://pokeapi.co/api/v2/pokemon/${pokemon.id}/encounters`,
                cache,
                process.argv.includes('--refresh'),
              ),
            );
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.startsWith('Permanent upstream error 404')
            )
              available = false;
            else throw error;
          }
          varieties.push({
            id: pokemon.id,
            moves,
            encountersAvailable: available,
            encounters: encounters.flatMap((area) =>
              area.version_details.flatMap((version) =>
                version.encounter_details.map((detail) => ({
                  version: version.version.name,
                  area: area.location_area.name,
                  method: detail.method.name,
                  min: detail.min_level,
                  max: detail.max_level,
                  conditions: detail.condition_values.map(
                    (condition) => condition.name,
                  ),
                })),
              ),
            ),
          });
        }
        const allowed = new Set([...Object.keys(languages), 'ja-Hrkt']);
        data[index] = referenceSchema.parse({
          speciesId: id,
          names: Object.fromEntries(
            species.names
              .filter((name) => allowed.has(name.language.name))
              .map((name) => [name.language.name, name.name]),
          ),
          descriptions: species.flavor_text_entries
            .filter((entry) => allowed.has(entry.language.name))
            .map((entry) => ({
              language: entry.language.name,
              version: entry.version.name,
              text: entry.flavor_text.replace(/\s+/g, ' ').trim(),
            })),
          varieties,
        });
        if (++done % 200 === 0)
          console.log(
            `Validated references for ${done}/${records.length} species`,
          );
      }
    }),
  );
  const failed = jobs.find(
    (job): job is PromiseRejectedResult => job.status === 'rejected',
  );
  if (failed) throw failed.reason;
  const version = createHash('sha256')
      .update(JSON.stringify(games) + JSON.stringify(data))
      .digest('hex')
      .slice(0, 16),
    parent = path.join(root, 'reference'),
    directory = path.join(parent, version);
  await mkdir(parent, { recursive: true });
  if (
    !(await access(directory).then(
      () => true,
      () => false,
    ))
  ) {
    const stage = path.join(parent, `.staging-${randomUUID()}`);
    await mkdir(stage);
    for (const group of data)
      await writeFile(
        path.join(stage, `${group.speciesId}.json`),
        JSON.stringify(group),
      );
    await renameWithRetry(stage, directory);
  }
  const result = referenceManifestSchema.parse({
    schemaVersion: 1,
    version,
    generatedAt: new Date().toISOString(),
    speciesCount: data.length,
    games,
  });
  await writeFile(
    path.join(parent, 'manifest.json.tmp'),
    JSON.stringify(result, null, 2),
  );
  await rename(
    path.join(parent, 'manifest.json.tmp'),
    path.join(parent, 'manifest.json'),
  );
  console.log(
    `Published ${data.length} species references and ${games.length} game groups.`,
  );
} finally {
  await lock.close();
  await unlink(lockPath);
}
