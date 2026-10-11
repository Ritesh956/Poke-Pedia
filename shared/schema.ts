import { z } from 'zod';
export const pokemonTypes = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;
export type PokemonType = (typeof pokemonTypes)[number];
export const typeColors: Record<PokemonType, string> = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};
export const statNames = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;
export const pokemonSchema = z.object({
  id: z.number().int().positive(),
  speciesId: z.number().int().positive(),
  slug: z.string().min(1),
  name: z.string().min(1),
  generation: z.string(),
  form: z.string(),
  types: z.array(z.enum(pokemonTypes)).min(1).max(2),
  height: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  abilities: z.array(z.string()),
  hiddenAbilities: z.array(z.string()),
  stats: z.object(
    Object.fromEntries(
      statNames.map((name) => [name, z.number().int().nonnegative()]),
    ) as Record<(typeof statNames)[number], z.ZodNumber>,
  ),
  description: z.string(),
  category: z.string(),
  imageUrl: z.string().url().nullable(),
  shinyImageUrl: z.string().url().nullable().default(null),
  isDefault: z.boolean().default(true),
  soundUrl: z.string().url().nullable(),
  isLegendary: z.boolean(),
  isMythical: z.boolean(),
  isBaby: z.boolean(),
  evolutionChainId: z.number().int().positive().nullable(),
});
export type Pokemon = z.infer<typeof pokemonSchema>;
export const catalogueSchema = z
  .array(pokemonSchema)
  .superRefine((records, ctx) => {
    if (
      new Set(records.map((p) => p.speciesId)).size !== records.length ||
      new Set(records.map((p) => p.id)).size !== records.length
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate catalogue identity',
      });
  });
export const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string().regex(/^[a-f0-9]{16}$/),
    generatedAt: z.string().datetime(),
    expectedCount: z.number().int().positive(),
    recordCount: z.number().int().positive(),
    missingIds: z.array(z.number().int().positive()),
    generations: z.array(z.string()),
    scope: z.literal('default varieties'),
  })
  .refine(
    (m) => m.recordCount + m.missingIds.length === m.expectedCount,
    'Invalid snapshot counts',
  );
export type Manifest = z.infer<typeof manifestSchema>;
export interface EvolutionNode {
  speciesId: number;
  name: string;
  conditions: string[][];
  children: EvolutionNode[];
}
export const evolutionNodeSchema: z.ZodType<EvolutionNode> = z.lazy(() =>
  z.object({
    speciesId: z.number().int().positive(),
    name: z.string(),
    conditions: z.array(z.array(z.string())),
    children: z.array(evolutionNodeSchema),
  }),
);
