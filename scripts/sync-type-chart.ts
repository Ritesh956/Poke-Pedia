import { mkdir, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { pokemonTypes, type PokemonType } from '../shared/schema';
import { typeChartSchema, type TypeChart } from '../shared/team';
import { cachedGet } from './lib/upstream';
const cache = path.resolve('.cache/pokeapi'),
  root = path.resolve('client/public/data');
await mkdir(cache, { recursive: true });
const lockPath = path.join(cache, 'sync.lock');
const lock = await open(lockPath, 'wx').catch(() => {
  throw new Error('Another data refresh is running. Wait for it to finish.');
});
const relationSchema = z.array(z.object({ name: z.enum(pokemonTypes) }));
const typeResource = z.object({
  name: z.enum(pokemonTypes),
  damage_relations: z.object({
    double_damage_from: relationSchema,
    half_damage_from: relationSchema,
    no_damage_from: relationSchema,
  }),
});
try {
  const matchups = Object.fromEntries(
    pokemonTypes.map((attack) => [
      attack,
      Object.fromEntries(pokemonTypes.map((defense) => [defense, 1])),
    ]),
  ) as TypeChart['matchups'];
  for (const defender of pokemonTypes) {
    const data = typeResource.parse(
      await cachedGet(
        `https://pokeapi.co/api/v2/type/${defender}/`,
        cache,
        process.argv.includes('--refresh'),
      ),
    );
    if (data.name !== defender) throw new Error('Unexpected type identity');
    const assigned = new Set<PokemonType>();
    for (const [group, multiplier] of [
      [data.damage_relations.double_damage_from, 2],
      [data.damage_relations.half_damage_from, 0.5],
      [data.damage_relations.no_damage_from, 0],
    ] as const) {
      for (const { name } of group) {
        if (assigned.has(name))
          throw new Error('Conflicting type relationship');
        assigned.add(name);
        matchups[name][defender] = multiplier;
      }
    }
  }
  const chart = typeChartSchema.parse({
    schemaVersion: 1,
    ruleset: 'standard-generation-vi-onward',
    generatedAt: new Date().toISOString(),
    matchups,
  });
  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, 'type-chart.json.tmp'),
    JSON.stringify(chart, null, 2),
  );
  await rename(
    path.join(root, 'type-chart.json.tmp'),
    path.join(root, 'type-chart.json'),
  );
  console.log('Published validated standard type chart for all 18 types.');
} finally {
  await lock.close();
  await unlink(lockPath);
}
