import { z } from 'zod';
const ids = z
  .array(z.number().int().positive().max(100000))
  .max(5000)
  .transform((values) => [...new Set(values)]);
export const collectionSchema = z
  .object({ schemaVersion: z.literal(1), favorites: ids, caught: ids })
  .strict();
export type Collection = z.infer<typeof collectionSchema>;
export const emptyCollection: Collection = {
  schemaVersion: 1,
  favorites: [],
  caught: [],
};
export const collectionStorageKey = 'pokemonpedia.collection.v1';
export function parseCollection(text: string): Collection {
  if (text.length > 1024 * 1024)
    throw new Error('Collection files must be smaller than 1 MB.');
  try {
    return collectionSchema.parse(JSON.parse(text));
  } catch {
    throw new Error(
      'Choose a PokemonPedia collection file with schemaVersion 1 and valid Pokémon numbers.',
    );
  }
}
export type CollectionKind = 'favorites' | 'caught';
