import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { formsSchema, formsManifestSchema } from '../shared/forms';
import { catalogueSchema } from '../shared/schema';
import { makeQuestion, randomPokemon } from '../shared/discovery';
const manifest = JSON.parse(
  await readFile('client/public/data/manifest.json', 'utf8'),
);
const records = catalogueSchema.parse(
  JSON.parse(
    await readFile(
      `client/public/data/${manifest.version}/catalogue.json`,
      'utf8',
    ),
  ),
);
it('keeps form identities, types, media, and stats associated with the correct species', async () => {
  const meta = formsManifestSchema.parse(
    JSON.parse(
      await readFile('client/public/data/forms/manifest.json', 'utf8'),
    ),
  );
  const group = formsSchema.parse(
    JSON.parse(
      await readFile(`client/public/data/forms/${meta.version}/6.json`, 'utf8'),
    ),
  );
  const mega = group.forms.find((form) => form.slug === 'charizard-mega-x')!;
  expect(mega).toMatchObject({
    speciesId: 6,
    isDefault: false,
    types: ['fire', 'dragon'],
  });
  expect(mega.shinyImageUrl).toContain(String(mega.id));
  expect(mega.stats.attack).toBeGreaterThan(
    group.forms.find((form) => form.isDefault)!.stats.attack,
  );
  expect(() => formsSchema.parse({ ...group, speciesId: 25 })).toThrow();
  expect(meta.speciesCount).toBe(records.length);
});
it('creates four distinct choices with exactly one matching type set', () => {
  for (const seed of [0, 0.25, 0.5, 0.75, 0.999]) {
    const question = makeQuestion(records, () => seed)!;
    expect(
      new Set(question.options.map((option) => option.speciesId)).size,
    ).toBe(4);
    expect(
      question.options.filter(
        (option) =>
          [...option.types].sort().join(',') ===
          [...question.types].sort().join(','),
      ),
    ).toHaveLength(1);
    expect(
      question.options.some((option) => option.speciesId === question.answerId),
    ).toBe(true);
  }
});
it('handles empty or insufficient quiz pools and random boundaries safely', () => {
  expect(makeQuestion([])).toBeNull();
  expect(makeQuestion(records.slice(0, 3))).toBeNull();
  expect(randomPokemon([])).toBeUndefined();
  expect(randomPokemon(records, () => 0)).toBe(records[0]);
  expect(randomPokemon(records, () => 0.99999)).toBe(records.at(-1));
});
