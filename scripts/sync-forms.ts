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
import { catalogueSchema, manifestSchema } from '../shared/schema';
import { formsSchema, formsManifestSchema } from '../shared/forms';
import {
  upstreamSpecies,
  normalizePokemon,
  displayName,
} from '../shared/pokemon';
import { cachedGet } from './lib/upstream';
import { renameWithRetry } from './lib/rename';
const root = path.resolve('client/public/data'),
  cache = path.resolve('.cache/pokeapi');
await mkdir(cache, { recursive: true });
const lockPath = path.join(cache, 'sync.lock'),
  lock = await open(lockPath, 'wx').catch(() => {
    throw new Error('Another data refresh is running. Wait for it to finish.');
  });
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
  const groups: ReturnType<typeof formsSchema.parse>[] = new Array(
    records.length,
  );
  let cursor = 0,
    done = 0;
  const jobs = await Promise.allSettled(
    Array.from({ length: 6 }, async () => {
      while (cursor < records.length) {
        const index = cursor++,
          speciesId = records[index].speciesId;
        const species = upstreamSpecies.parse(
          await cachedGet(
            `https://pokeapi.co/api/v2/pokemon-species/${speciesId}/`,
            cache,
          ),
        );
        const forms = [];
        for (const variety of species.varieties) {
          const form = normalizePokemon(
            await cachedGet(
              variety.pokemon.url,
              cache,
              process.argv.includes('--refresh'),
            ),
            species,
          );
          form.isDefault = variety.is_default;
          if (!variety.is_default) form.name = displayName(form.slug);
          forms.push(form);
        }
        groups[index] = formsSchema.parse({ speciesId, forms });
        if (++done % 200 === 0)
          console.log(
            `Validated varieties for ${done}/${records.length} species`,
          );
      }
    }),
  );
  const failed = jobs.find(
    (job): job is PromiseRejectedResult => job.status === 'rejected',
  );
  if (failed) throw failed.reason;
  const version = createHash('sha256')
      .update(JSON.stringify(groups))
      .digest('hex')
      .slice(0, 16),
    parent = path.join(root, 'forms'),
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
    for (const group of groups)
      await writeFile(
        path.join(stage, `${group.speciesId}.json`),
        JSON.stringify(group),
      );
    await renameWithRetry(stage, directory);
  }
  const output = formsManifestSchema.parse({
    schemaVersion: 1,
    version,
    generatedAt: new Date().toISOString(),
    speciesCount: groups.length,
    formCount: groups.reduce((count, group) => count + group.forms.length, 0),
  });
  await writeFile(
    path.join(parent, 'manifest.json.tmp'),
    JSON.stringify(output, null, 2),
  );
  await rename(
    path.join(parent, 'manifest.json.tmp'),
    path.join(parent, 'manifest.json'),
  );
  console.log(
    `Published ${output.formCount} varieties across ${groups.length} species.`,
  );
} finally {
  await lock.close();
  await unlink(lockPath);
}
