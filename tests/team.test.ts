import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  parseTeam,
  parseTeamUrl,
  teamToUrl,
  teamSchema,
  typeChartSchema,
  defensiveMultiplier,
  teamCoverage,
} from '../shared/team';
import { pokemonTypes, catalogueSchema } from '../shared/schema';
const chart = typeChartSchema.parse(
  JSON.parse(await readFile('client/public/data/type-chart.json', 'utf8')),
);
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
it('combines dual types into 4x, quarter damage, neutrality, and immunities', () => {
  expect(defensiveMultiplier(chart, 'rock', ['fire', 'flying'])).toBe(4);
  expect(defensiveMultiplier(chart, 'grass', ['fire', 'flying'])).toBe(0.25);
  expect(defensiveMultiplier(chart, 'ground', ['fire', 'flying'])).toBe(0);
  expect(defensiveMultiplier(chart, 'fighting', ['normal', 'ghost'])).toBe(0);
  expect(defensiveMultiplier(chart, 'poison', ['steel', 'fairy'])).toBe(0);
  expect(defensiveMultiplier(chart, 'steel', ['water', 'fairy'])).toBe(1);
  expect(defensiveMultiplier(chart, 'electric', ['water', 'ground'])).toBe(0);
});
it('includes all 324 standard matchups and rejects partial saved charts', () => {
  for (const attack of pokemonTypes)
    expect(Object.keys(chart.matchups[attack])).toHaveLength(18);
  expect(() =>
    typeChartSchema.parse({
      ...chart,
      matchups: { normal: chart.matchups.normal },
    }),
  ).toThrow();
  expect(chart.matchups.ghost.steel).toBe(1);
  expect(chart.matchups.fairy.dragon).toBe(2);
});
it('counts duplicated slots separately and excludes empty slots from team coverage', () => {
  const pikachu = records.find((p) => p.speciesId === 25)!;
  const results = teamCoverage(chart, [pikachu, pikachu]);
  expect(results.find((row) => row.attack === 'ground')).toMatchObject({
    weak: 2,
    resist: 0,
    immune: 0,
    neutral: 0,
    multipliers: [2, 2],
  });
  for (const row of results)
    expect(row.weak + row.resist + row.immune + row.neutral).toBe(2);
  for (const row of teamCoverage(chart, []))
    expect(row.multipliers).toEqual([]);
});
it('preserves six ordered slots including duplicates and empty slots through URL and JSON', () => {
  const team = teamSchema.parse({
    schemaVersion: 1,
    slots: [25, null, 25, 6, null, 133],
  });
  expect(parseTeamUrl(teamToUrl(team))).toEqual(team);
  expect(parseTeam(JSON.stringify(team))).toEqual(team);
  expect(parseTeamUrl(null).slots).toEqual([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
});
it('rejects malformed, oversized, and unsupported team files and links', () => {
  for (const value of [
    '1,2',
    '1,2,3,4,5,6,7',
    '-1,0,0,0,0,0',
    '25abc,0,0,0,0,0',
    '999999,0,0,0,0,0',
  ])
    expect(() => parseTeamUrl(value)).toThrow();
  for (const value of [
    { schemaVersion: 2, slots: [25, null, null, null, null, null] },
    { schemaVersion: 1, slots: [25] },
    { schemaVersion: 1, slots: ['25', null, null, null, null, null] },
  ])
    expect(() => parseTeam(JSON.stringify(value))).toThrow();
  expect(() => parseTeam(' '.repeat(10001))).toThrow('10 KB');
});
