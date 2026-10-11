import { z } from 'zod';
import {
  pokemonSchema,
  statNames,
  type Pokemon,
  type PokemonType,
  type EvolutionNode,
  typeColors,
} from './schema';
const named = z.object({ name: z.string(), url: z.string().url().optional() });
const localized = z.object({ language: named });
const upstreamPokemon = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  is_default: z.boolean().optional(),
  height: z.number().int().nonnegative(),
  weight: z.number().int().nonnegative(),
  types: z.array(z.object({ type: named })),
  abilities: z.array(z.object({ ability: named, is_hidden: z.boolean() })),
  stats: z.array(z.object({ base_stat: z.number().int(), stat: named })),
  sprites: z.object({
    front_default: z.string().nullable(),
    front_shiny: z.string().nullable().optional(),
    other: z.object({
      'official-artwork': z.object({
        front_default: z.string().nullable(),
        front_shiny: z.string().nullable().optional(),
      }),
    }),
  }),
  cries: z.object({ latest: z.string().nullable() }).optional(),
  species: z.object({ url: z.string().url() }),
});
export const upstreamSpecies = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  generation: named,
  names: z.array(localized.extend({ name: z.string() })),
  genera: z.array(localized.extend({ genus: z.string() })),
  flavor_text_entries: z.array(localized.extend({ flavor_text: z.string() })),
  is_legendary: z.boolean(),
  is_mythical: z.boolean(),
  is_baby: z.boolean(),
  evolution_chain: z.object({ url: z.string().url() }).nullable(),
  varieties: z.array(
    z.object({
      is_default: z.boolean(),
      pokemon: z.object({ name: z.string(), url: z.string().url() }),
    }),
  ),
});
export function resourceId(url: string): number {
  const value = Number(new URL(url).pathname.split('/').filter(Boolean).at(-1));
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error('Invalid resource ID');
  return value;
}
export const displayName = (slug: string) =>
  slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
export function normalizePokemon(raw: unknown, rawSpecies: unknown): Pokemon {
  const p = upstreamPokemon.parse(raw),
    s = upstreamSpecies.parse(rawSpecies);
  if (resourceId(p.species.url) !== s.id)
    throw new Error('Species identity mismatch');
  return pokemonSchema.parse({
    id: p.id,
    speciesId: s.id,
    slug: p.name,
    name:
      s.names.find((n) => n.language.name === 'en')?.name ??
      displayName(s.name),
    generation: s.generation.name,
    form: p.name === s.name ? 'Default' : displayName(p.name),
    types: p.types.map((t) => t.type.name),
    height: p.height / 10,
    weight: p.weight / 10,
    abilities: p.abilities.map((a) => displayName(a.ability.name)),
    hiddenAbilities: p.abilities
      .filter((a) => a.is_hidden)
      .map((a) => displayName(a.ability.name)),
    stats: Object.fromEntries(
      statNames.map((name) => [
        name,
        p.stats.find((s) => s.stat.name === name)?.base_stat,
      ]),
    ),
    description: (
      s.flavor_text_entries.find((t) => t.language.name === 'en')
        ?.flavor_text ?? 'Description unavailable.'
    )
      .replace(/\s+/g, ' ')
      .trim(),
    category:
      s.genera.find((g) => g.language.name === 'en')?.genus ?? 'Unknown',
    imageUrl:
      p.sprites.other['official-artwork'].front_default ??
      p.sprites.front_default,
    shinyImageUrl:
      p.sprites.other['official-artwork'].front_shiny ??
      p.sprites.front_shiny ??
      null,
    isDefault: p.is_default ?? true,
    soundUrl: p.cries?.latest ?? null,
    isLegendary: s.is_legendary,
    isMythical: s.is_mythical,
    isBaby: s.is_baby,
    evolutionChainId: s.evolution_chain
      ? resourceId(s.evolution_chain.url)
      : null,
  });
}
interface RawNode {
  species: { name: string; url: string };
  evolution_details: Record<string, unknown>[];
  evolves_to: RawNode[];
}
const rawNode: z.ZodType<RawNode> = z.lazy(() =>
  z.object({
    species: z.object({ name: z.string(), url: z.string().url() }),
    evolution_details: z.array(z.record(z.unknown())),
    evolves_to: z.array(rawNode),
  }),
);
function conditionLabel(key: string, value: unknown): string | null {
  if (key === 'is_default') return null;
  if (value === null || value === undefined || value === false || value === '')
    return null;
  const name =
    typeof value === 'object' && value && 'name' in value
      ? String(value.name)
      : String(value);
  if (key === 'gender')
    return name === '1' ? 'Female' : name === '2' ? 'Male' : 'Genderless';
  if (key === 'relative_physical_stats')
    return name === '0'
      ? 'Attack = Defense'
      : name === '1'
        ? 'Attack > Defense'
        : 'Attack < Defense';
  if (key === 'trigger') return displayName(name);
  if (key === 'version_group') return `Games: ${displayName(name)}`;
  if (key === 'min_level') return `Level ${name} or higher`;
  if (key === 'item') return `Use ${displayName(name)}`;
  if (key === 'held_item') return `Holding ${displayName(name)}`;
  if (key === 'min_happiness') return `Friendship ${name} or higher`;
  if (key === 'time_of_day') return `During the ${name}`;
  return `${displayName(key.replace(/_/g, '-'))}: ${typeof value === 'boolean' ? 'Yes' : displayName(name)}`;
}
export function normalizeEvolution(raw: unknown): EvolutionNode {
  const root = z.object({ chain: rawNode }).parse(raw).chain;
  const walk = (n: RawNode): EvolutionNode => ({
    speciesId: resourceId(n.species.url),
    name: displayName(n.species.name),
    conditions: n.evolution_details.map((d) =>
      Object.entries(d)
        .map(([k, v]) => conditionLabel(k, v))
        .filter((v): v is string => v !== null),
    ),
    children: n.evolves_to.map(walk),
  });
  return walk(root);
}
export interface Filters {
  query: string;
  type: PokemonType | 'all';
  legendary: boolean;
  mythical: boolean;
  baby: boolean;
  sort: 'id' | 'name' | 'height' | 'weight';
}
export function filterPokemon(records: Pokemon[], filters: Filters): Pokemon[] {
  const query = filters.query.trim().toLocaleLowerCase(),
    id = /^#?\d+$/.test(query) ? Number(query.replace('#', '')) : null;
  return records
    .filter(
      (p) =>
        (filters.type === 'all' || p.types.includes(filters.type)) &&
        (!query ||
          (id !== null
            ? p.speciesId === id
            : p.name.toLocaleLowerCase().includes(query) ||
              p.slug.includes(query))) &&
        (!(filters.legendary || filters.mythical || filters.baby) ||
          (filters.legendary && p.isLegendary) ||
          (filters.mythical && p.isMythical) ||
          (filters.baby && p.isBaby)),
    )
    .sort((a, b) =>
      filters.sort === 'name'
        ? a.name.localeCompare(b.name)
        : filters.sort === 'id'
          ? a.speciesId - b.speciesId
          : a[filters.sort] - b[filters.sort],
    );
}
export function badgeTextColor(type: PokemonType): string {
  const rgb = typeColors[type]
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? '#000000'
    : '#ffffff';
}
