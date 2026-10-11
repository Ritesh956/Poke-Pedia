import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  referenceSchema,
  referenceManifestSchema,
  localizedDescription,
  gameMoves,
  gameEncounters,
  conditionsForGame,
  type ReferenceData,
} from '../shared/reference';
const manifest = referenceManifestSchema.parse(
  JSON.parse(
    await readFile('client/public/data/reference/manifest.json', 'utf8'),
  ),
);
it('validates saved reference identity, languages, games and variety data', async () => {
  const data = referenceSchema.parse(
    JSON.parse(
      await readFile(
        `client/public/data/reference/${manifest.version}/6.json`,
        'utf8',
      ),
    ),
  );
  expect(data.speciesId).toBe(6);
  expect(data.names.fr).toBe('Dracaufeu');
  expect(data.names.ja).toBe('リザードン');
  expect(data.varieties.some((variety) => variety.id === 10034)).toBe(true);
  expect(manifest.speciesCount).toBe(1025);
  expect(manifest.games.length).toBe(32);
  const red = manifest.games.find((game) => game.slug === 'red-blue')!;
  expect(gameMoves(data, 6, red.id).some((move) => move.name === 'ember')).toBe(
    true,
  );
  expect(gameMoves(data, 10034, red.id)).toEqual([]);
});
it('prefers the requested game, identifies language fallback and identifies version fallback', () => {
  const data: ReferenceData = {
    speciesId: 1,
    names: { en: 'Test' },
    descriptions: [
      { language: 'en', version: 'red', text: 'English Red' },
      { language: 'fr', version: 'x', text: 'French X' },
      { language: 'ja-Hrkt', version: 'red', text: 'Japanese Red' },
    ],
    varieties: [
      { id: 1, moves: [], encounters: [], encountersAvailable: true },
    ],
  };
  expect(
    localizedDescription(data, 'fr', {
      id: 1,
      slug: 'red-blue',
      versions: ['red', 'blue'],
    }),
  ).toMatchObject({ language: 'en', text: 'English Red', gameMatches: true });
  expect(
    localizedDescription(data, 'fr', {
      id: 15,
      slug: 'x-y',
      versions: ['x', 'y'],
    }),
  ).toMatchObject({ language: 'fr', gameMatches: true });
  expect(
    localizedDescription(data, 'ja', {
      id: 1,
      slug: 'red-blue',
      versions: ['red'],
    }),
  ).toMatchObject({ language: 'ja-Hrkt', gameMatches: true });
  expect(
    localizedDescription(data, 'fr', {
      id: 99,
      slug: 'unavailable',
      versions: [],
    }),
  ).toMatchObject({ language: 'fr', gameMatches: false });
});
it('filters move learning and encounters without confusing forms or game groups', () => {
  const data: ReferenceData = {
    speciesId: 1,
    names: {},
    descriptions: [],
    varieties: [
      {
        id: 1,
        moves: [
          {
            name: 'tackle',
            learns: [
              [1, 'level-up', 1],
              [2, 'machine', 0],
            ],
          },
        ],
        encountersAvailable: true,
        encounters: [
          {
            version: 'red',
            area: 'forest',
            method: 'walk',
            min: 2,
            max: 3,
            conditions: [],
          },
          {
            version: 'gold',
            area: 'lake',
            method: 'surf',
            min: 5,
            max: 6,
            conditions: [],
          },
        ],
      },
    ],
  };
  expect(gameMoves(data, 1, 1)).toEqual([
    { name: 'tackle', method: 'level-up', level: 1 },
  ]);
  expect(gameMoves(data, 99, 1)).toEqual([]);
  expect(
    gameEncounters(data, 1, {
      id: 1,
      slug: 'red-blue',
      versions: ['red', 'blue'],
    }).map((encounter) => encounter.area),
  ).toEqual(['forest']);
});
it('filters source-tagged evolution rules and preserves explicit fallback alternatives', () => {
  const rules = [
    ['Games: Red Blue', 'Level 16'],
    ['Games: Gold Silver', 'Level 18'],
  ];
  expect(conditionsForGame(rules, 'red-blue')).toEqual({
    conditions: [rules[0]],
    specific: true,
  });
  expect(conditionsForGame(rules, 'scarlet-violet')).toEqual({
    conditions: rules,
    specific: false,
  });
  expect(conditionsForGame(rules)).toEqual({
    conditions: rules,
    specific: false,
  });
});
