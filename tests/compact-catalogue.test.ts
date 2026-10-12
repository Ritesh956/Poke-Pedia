import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { catalogueSchema, manifestSchema } from '../shared/schema';
import {
  encodeCompactCatalogue,
  decodeCompactCatalogue,
} from '../shared/compact-catalogue';

const manifest = manifestSchema.parse(
  JSON.parse(await readFile('client/public/data/manifest.json', 'utf8')),
);
const records = catalogueSchema.parse(
  JSON.parse(
    await readFile(
      `client/public/data/${manifest.version}/catalogue.json`,
      'utf8',
    ),
  ),
);
const wire = encodeCompactCatalogue(records);
it('restores every field of all saved species without changing the snapshot', () => {
  expect(decodeCompactCatalogue(JSON.parse(JSON.stringify(wire)))).toEqual(
    records,
  );
  expect(encodeCompactCatalogue(records)).toEqual(wire);
});
it('preserves null media, fractional measurements, identities and hidden abilities', () => {
  const fixture = {
    ...records[0],
    id: 10001,
    speciesId: 1,
    height: 0.1,
    weight: 0.3,
    imageUrl: null,
    shinyImageUrl: null,
    soundUrl: null,
    evolutionChainId: null,
    isDefault: false,
    form: 'Example form',
    hiddenAbilities: ['Chlorophyll'],
  };
  expect(decodeCompactCatalogue(encodeCompactCatalogue([fixture]))).toEqual([
    fixture,
  ]);
});
it('rejects unknown encodings, mismatched columns, truncated rows and invalid dictionary references', () => {
  const changes = [
    { ...wire, encoding: 'unknown' },
    { ...wire, fields: [...wire.fields].reverse() },
    { ...wire, rows: [wire.rows[0].slice(1)] },
    { ...wire, strings: [] },
    { ...wire, prefixes: [] },
  ];
  for (const value of changes)
    expect(() => decodeCompactCatalogue(value)).toThrow();
});
it('validates decoded stats, media URLs and duplicate identities', () => {
  const mutate = (field: string, value: unknown) => ({
    ...wire,
    rows: [wire.rows[0].map((v, i) => (wire.fields[i] === field ? value : v))],
  });
  expect(() => decodeCompactCatalogue(mutate('stats', [1, 2]))).toThrow();
  expect(() =>
    decodeCompactCatalogue(mutate('stats', [-1, 2, 3, 4, 5, 6])),
  ).toThrow();
  expect(() =>
    decodeCompactCatalogue({
      ...wire,
      prefixes: ['invalid'],
      rows: [wire.rows[0]],
    }),
  ).toThrow();
  expect(() =>
    decodeCompactCatalogue({ ...wire, rows: [wire.rows[0], wire.rows[0]] }),
  ).toThrow();
});
