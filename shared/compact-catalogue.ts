import { z } from 'zod';
import { catalogueSchema, statNames, type Pokemon } from './schema';

// Versioned transport only. Decoding restores the complete existing model.
export const compactCatalogueFilename = 'catalogue.compact-v1.json';
const columns = [
  'id',
  'speciesId',
  'slug',
  'name',
  'generation',
  'form',
  'types',
  'height',
  'weight',
  'abilities',
  'hiddenAbilities',
  'stats',
  'description',
  'category',
  'imageUrl',
  'shinyImageUrl',
  'isDefault',
  'soundUrl',
  'isLegendary',
  'isMythical',
  'isBaby',
  'evolutionChainId',
] as const satisfies readonly (keyof Pokemon)[];
const textFields = new Set(['generation', 'form', 'category']);
const listFields = new Set(['abilities', 'hiddenAbilities']);
const urlFields = new Set(['imageUrl', 'shinyImageUrl', 'soundUrl']);
const referenceSchema = z.number().int().nonnegative();
const listReferencesSchema = z.array(referenceSchema);
const statsSchema = z
  .array(z.number().int().nonnegative())
  .length(statNames.length);
const urlTokenSchema = z.tuple([referenceSchema, z.string()]);
const transportSchema = z
  .object({
    schemaVersion: z.literal(1),
    encoding: z.literal('lossless-columns-v1'),
    fields: z
      .array(z.string())
      .refine(
        (fields) =>
          fields.length === columns.length &&
          fields.every((field, i) => field === columns[i]),
        'Incorrect compact catalogue columns',
      ),
    strings: z.array(z.string()),
    prefixes: z.array(z.string()),
    rows: z.array(z.array(z.unknown()).length(columns.length)),
  })
  .strict();

export function encodeCompactCatalogue(input: Pokemon[]) {
  const records = catalogueSchema.parse(input);
  const strings: string[] = [],
    prefixes: string[] = [];
  function intern(table: string[], value: string) {
    const found = table.indexOf(value);
    return found < 0 ? table.push(value) - 1 : found;
  }
  const rows = records.map((record) =>
    columns.map((field) => {
      const value = record[field];
      if (textFields.has(field)) return intern(strings, value as string);
      if (listFields.has(field))
        return (value as string[]).map((text) => intern(strings, text));
      if (field === 'stats') return statNames.map((stat) => record.stats[stat]);
      if (urlFields.has(field) && typeof value === 'string') {
        const boundary = value.lastIndexOf('/') + 1;
        return [
          intern(prefixes, value.slice(0, boundary)),
          value.slice(boundary),
        ];
      }
      return value;
    }),
  );
  return transportSchema.parse({
    schemaVersion: 1,
    encoding: 'lossless-columns-v1',
    fields: columns,
    strings,
    prefixes,
    rows,
  });
}

export function decodeCompactCatalogue(input: unknown): Pokemon[] {
  const wire = transportSchema.parse(input);
  function lookup(table: string[], value: unknown) {
    const index = referenceSchema.parse(value);
    if (index >= table.length)
      throw new Error('Invalid compact catalogue reference');
    return table[index];
  }
  return catalogueSchema.parse(
    wire.rows.map((row) =>
      Object.fromEntries(
        columns.map((field, i) => {
          let value = row[i];
          if (textFields.has(field)) value = lookup(wire.strings, value);
          else if (listFields.has(field))
            value = listReferencesSchema
              .parse(value)
              .map((index) => lookup(wire.strings, index));
          else if (field === 'stats') {
            const values = statsSchema.parse(value);
            value = Object.fromEntries(
              statNames.map((name, i) => [name, values[i]]),
            );
          } else if (urlFields.has(field) && value !== null) {
            const [prefix, suffix] = urlTokenSchema.parse(value);
            value = lookup(wire.prefixes, prefix) + suffix;
          }
          return [field, value];
        }),
      ),
    ),
  );
}
