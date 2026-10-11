import { describe, it, expect } from 'vitest';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  catalogueSchema,
  manifestSchema,
  pokemonTypes,
  typeColors,
  statNames,
} from '../shared/schema';
import {
  normalizePokemon,
  normalizeEvolution,
  filterPokemon,
  badgeTextColor,
  type Filters,
} from '../shared/pokemon';
import { publishSnapshot } from '../scripts/lib/publish-snapshot';
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
const defaultFilters: Filters = {
  query: '',
  type: 'all',
  legendary: false,
  mythical: false,
  baby: false,
  sort: 'id',
};
describe('Catalogue discovery', () => {
  it('finds names and exact numeric species IDs with whitespace and padding', () => {
    for (const query of [' pikachu ', '25', '#025'])
      expect(
        filterPokemon(records, { ...defaultFilters, query }).map(
          (p) => p.speciesId,
        ),
      ).toEqual([25]);
    expect(
      filterPokemon(records, { ...defaultFilters, query: 'does-not-exist' }),
    ).toEqual([]);
  });
  it('combines type and search with OR special categories', () => {
    const fixture = [
      records[0],
      { ...records[1], isLegendary: true },
      { ...records[2], isMythical: true },
    ];
    expect(
      filterPokemon(fixture, {
        ...defaultFilters,
        legendary: true,
        mythical: true,
      }).map((p) => p.speciesId),
    ).toEqual([2, 3]);
    expect(
      filterPokemon(fixture, {
        ...defaultFilters,
        type: 'fire',
        legendary: true,
      }),
    ).toEqual([]);
  });
  it('validates a complete persisted snapshot including every referenced family', async () => {
    expect(records).toHaveLength(manifest.expectedCount);
    expect(manifest.missingIds).toEqual([]);
    for (const id of new Set(
      records.flatMap((p) => (p.evolutionChainId ? [p.evolutionChainId] : [])),
    )) {
      const family = JSON.parse(
        await readFile(
          `client/public/data/${manifest.version}/evolution/${id}.json`,
          'utf8',
        ),
      );
      expect(family.speciesId).toBeGreaterThan(0);
    }
  });
});
describe('Data normalization', () => {
  it('preserves species identity, fractional measurements, hidden abilities and media', () => {
    const species = {
      id: 29,
      name: 'nidoran-f',
      generation: { name: 'generation-i' },
      names: [{ name: 'Nidoran♀', language: { name: 'en' } }],
      genera: [],
      flavor_text_entries: [
        { flavor_text: 'A\fsmall\nPokémon.', language: { name: 'en' } },
      ],
      is_legendary: false,
      is_mythical: false,
      is_baby: false,
      evolution_chain: null,
      varieties: [],
    };
    const raw = {
      id: 10029,
      name: 'nidoran-f-test',
      height: 4,
      weight: 70,
      species: { url: 'https://pokeapi.co/api/v2/pokemon-species/29/' },
      types: [{ type: { name: 'poison' } }],
      abilities: [{ ability: { name: 'hustle' }, is_hidden: true }],
      stats: statNames.map((name) => ({ stat: { name }, base_stat: 50 })),
      sprites: {
        front_default: null,
        other: { 'official-artwork': { front_default: null } },
      },
      cries: { latest: 'https://example.com/29.ogg' },
    };
    const result = normalizePokemon(raw, species);
    expect(result).toMatchObject({
      id: 10029,
      speciesId: 29,
      name: 'Nidoran♀',
      height: 0.4,
      weight: 7,
      hiddenAbilities: ['Hustle'],
      imageUrl: null,
      soundUrl: 'https://example.com/29.ogg',
      description: 'A small Pokémon.',
    });
    expect(() => normalizePokemon(raw, { ...species, id: 32 })).toThrow(
      'identity',
    );
  });
  it('preserves sibling branches, Pichu order and alternate conditions', async () => {
    const eevee = records.find((p) => p.speciesId === 133)!;
    const family = JSON.parse(
      await readFile(
        `client/public/data/${manifest.version}/evolution/${eevee.evolutionChainId}.json`,
        'utf8',
      ),
    );
    expect(family.speciesId).toBe(133);
    expect(family.children).toHaveLength(8);
    expect(
      family.children.every(
        (n: { children: unknown[] }) => n.children.length === 0,
      ),
    ).toBe(true);
    const pichu = records.find((p) => p.speciesId === 172)!;
    const babyFamily = JSON.parse(
      await readFile(
        `client/public/data/${manifest.version}/evolution/${pichu.evolutionChainId}.json`,
        'utf8',
      ),
    );
    expect([
      babyFamily.speciesId,
      babyFamily.children[0].speciesId,
      babyFamily.children[0].children[0].speciesId,
    ]).toEqual([172, 25, 26]);
    const n = (
      id: number,
      children: unknown[] = [],
      details: unknown[] = [],
    ) => ({
      species: {
        name: `test-${id}`,
        url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
      },
      evolves_to: children,
      evolution_details: details,
    });
    const tree = normalizeEvolution({
      chain: n(1, [
        n(
          2,
          [],
          [
            { min_level: 16, trigger: { name: 'level-up' }, time_of_day: null },
            { item: { name: 'fire-stone' } },
          ],
        ),
        n(3),
      ]),
    });
    expect(tree.children.map((c) => c.speciesId)).toEqual([2, 3]);
    expect(tree.children[0].conditions).toEqual([
      ['Level 16 or higher', 'Level Up'],
      ['Use Fire Stone'],
    ]);
  });
  it('gives every type badge at least 4.5:1 text contrast', () => {
    for (const type of pokemonTypes) {
      const values = typeColors[type]
        .slice(1)
        .match(/../g)!
        .map((v) => parseInt(v, 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      const l = values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      expect(
        badgeTextColor(type) === '#000000'
          ? (l + 0.05) / 0.05
          : 1.05 / (l + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
it('keeps the last good manifest when a refresh is invalid', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pokemonpedia-'));
  try {
    const record = { ...records[0], evolutionChainId: null };
    const smallManifest = {
      ...manifest,
      recordCount: 1,
      expectedCount: 1,
      missingIds: [],
    };
    await publishSnapshot(root, [record], [], smallManifest);
    const before = await readFile(path.join(root, 'manifest.json'), 'utf8');
    await expect(
      publishSnapshot(root, [{ ...record, height: -1 }], [], {
        ...smallManifest,
        version: '1234567890123456',
      }),
    ).rejects.toThrow();
    await expect(
      publishSnapshot(root, [record], [], {
        ...smallManifest,
        recordCount: 2,
        expectedCount: 2,
      }),
    ).rejects.toThrow('count');
    expect(await readFile(path.join(root, 'manifest.json'), 'utf8')).toBe(
      before,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
