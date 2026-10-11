import { z } from 'zod';
import { pokemonTypes, type PokemonType, type Pokemon } from './schema';
const slotSchema = z.number().int().positive().max(100000).nullable();
export const teamSchema = z
  .object({ schemaVersion: z.literal(1), slots: z.array(slotSchema).length(6) })
  .strict();
export type Team = z.infer<typeof teamSchema>;
export const emptyTeam: Team = {
  schemaVersion: 1,
  slots: [null, null, null, null, null, null],
};
export function parseTeam(text: string): Team {
  if (text.length > 10000)
    throw new Error('Team files must be smaller than 10 KB.');
  try {
    return teamSchema.parse(JSON.parse(text));
  } catch {
    throw new Error(
      'Choose a PokemonPedia team file with schemaVersion 1 and exactly six valid slots.',
    );
  }
}
export function parseTeamUrl(value: string | null): Team {
  if (!value) return { ...emptyTeam, slots: [...emptyTeam.slots] };
  if (
    value.length > 60 ||
    !/^(?:[1-9]\d*|0)(?:,(?:[1-9]\d*|0)){5}$/.test(value)
  )
    throw new Error(
      'This team link is invalid. Use six Pokémon numbers with 0 for empty slots.',
    );
  return teamSchema.parse({
    schemaVersion: 1,
    slots: value.split(',').map((id) => (id === '0' ? null : Number(id))),
  });
}
export function teamToUrl(team: Team): string {
  return teamSchema
    .parse(team)
    .slots.map((id) => id ?? 0)
    .join(',');
}
const multiplierSchema = z.union([
  z.literal(0),
  z.literal(0.5),
  z.literal(1),
  z.literal(2),
]);
const rowSchema = z
  .object(
    Object.fromEntries(
      pokemonTypes.map((type) => [type, multiplierSchema]),
    ) as Record<PokemonType, typeof multiplierSchema>,
  )
  .strict();
export const typeChartSchema = z.object({
  schemaVersion: z.literal(1),
  ruleset: z.literal('standard-generation-vi-onward'),
  generatedAt: z.string().datetime(),
  matchups: z
    .object(
      Object.fromEntries(
        pokemonTypes.map((type) => [type, rowSchema]),
      ) as Record<PokemonType, typeof rowSchema>,
    )
    .strict(),
});
export type TypeChart = z.infer<typeof typeChartSchema>;
export function defensiveMultiplier(
  chart: TypeChart,
  attack: PokemonType,
  defenders: readonly PokemonType[],
): number {
  return [...new Set(defenders)].reduce(
    (result, type) => result * chart.matchups[attack][type],
    1,
  );
}
export function teamCoverage(chart: TypeChart, members: Pokemon[]) {
  return pokemonTypes.map((attack) => {
    const multipliers = members.map((p) =>
      defensiveMultiplier(chart, attack, p.types),
    );
    return {
      attack,
      multipliers,
      weak: multipliers.filter((n) => n > 1).length,
      resist: multipliers.filter((n) => n > 0 && n < 1).length,
      immune: multipliers.filter((n) => n === 0).length,
      neutral: multipliers.filter((n) => n === 1).length,
    };
  });
}
