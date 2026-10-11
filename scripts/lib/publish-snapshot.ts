import { mkdir, writeFile, readFile, rename, access } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { renameWithRetry } from './rename';
import {
  catalogueSchema,
  evolutionNodeSchema,
  manifestSchema,
  type EvolutionNode,
} from '../../shared/schema';
export async function publishSnapshot(
  root: string,
  input: unknown,
  families: { id: number; tree: EvolutionNode }[],
  rawManifest: unknown,
) {
  const records = catalogueSchema.parse(input),
    manifest = manifestSchema.parse(rawManifest);
  if (records.length !== manifest.recordCount)
    throw new Error('Snapshot record count mismatch');
  if (
    new Set(manifest.missingIds).size !== manifest.missingIds.length ||
    records.some((p) => manifest.missingIds.includes(p.speciesId))
  )
    throw new Error('Invalid missing species');
  const familyIds = new Set(families.map((f) => f.id));
  for (const record of records)
    if (record.evolutionChainId && !familyIds.has(record.evolutionChainId))
      throw new Error('Missing evolution family');
  for (const family of families) evolutionNodeSchema.parse(family.tree);
  const directory = path.join(root, manifest.version);
  const exists = await access(directory).then(
    () => true,
    () => false,
  );
  if (exists) {
    if (
      (await readFile(path.join(directory, 'catalogue.json'), 'utf8')) !==
      JSON.stringify(records)
    )
      throw new Error('Existing snapshot content differs');
    for (const family of families)
      if (
        (await readFile(
          path.join(directory, 'evolution', `${family.id}.json`),
          'utf8',
        )) !== JSON.stringify(family.tree)
      )
        throw new Error('Existing family content differs');
  } else {
    const stage = path.join(
      root,
      `.staging-${manifest.version}-${randomUUID()}`,
    );
    await mkdir(path.join(stage, 'evolution'), { recursive: true });
    await writeFile(
      path.join(stage, 'catalogue.json'),
      JSON.stringify(records),
    );
    for (const family of families)
      await writeFile(
        path.join(stage, 'evolution', `${family.id}.json`),
        JSON.stringify(family.tree),
      );
    await renameWithRetry(stage, directory);
  }
  await writeFile(
    path.join(root, 'manifest.json.tmp'),
    JSON.stringify(manifest, null, 2),
  );
  await rename(
    path.join(root, 'manifest.json.tmp'),
    path.join(root, 'manifest.json'),
  );
}
