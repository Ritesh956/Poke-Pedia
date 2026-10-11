import { z } from 'zod';
import { displayName } from './pokemon';
export function conditionsForGame(conditions: string[][], game?: string) {
  if (!game) return { conditions, specific: false };
  const matches = conditions.filter((alternative) =>
    alternative.includes(`Games: ${displayName(game)}`),
  );
  return {
    conditions: matches.length ? matches : conditions,
    specific: matches.length > 0,
  };
}
export const languages = {
  en: 'English',
  ja: 'Japanese',
  fr: 'French',
  es: 'Spanish',
} as const;
export type ReferenceLanguage = keyof typeof languages;
const translated = z.record(z.string());
export const gameSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  versions: z.array(z.string()),
});
const moveSchema = z.object({
  name: z.string(),
  learns: z.array(
    z.tuple([
      z.number().int().positive(),
      z.string(),
      z.number().int().nonnegative(),
    ]),
  ),
});
const encounterSchema = z.object({
  version: z.string(),
  area: z.string(),
  method: z.string(),
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
  conditions: z.array(z.string()),
});
export const referenceSchema = z
  .object({
    speciesId: z.number().int().positive(),
    names: translated,
    descriptions: z.array(
      z.object({ language: z.string(), version: z.string(), text: z.string() }),
    ),
    varieties: z
      .array(
        z.object({
          id: z.number().int().positive(),
          moves: z.array(moveSchema),
          encounters: z.array(encounterSchema),
          encountersAvailable: z.boolean(),
        }),
      )
      .min(1),
  })
  .refine(
    (data) =>
      new Set(data.varieties.map((variety) => variety.id)).size ===
      data.varieties.length,
    'Duplicate reference variety',
  );
export const referenceManifestSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.string().regex(/^[a-f0-9]{16}$/),
  generatedAt: z.string().datetime(),
  speciesCount: z.number().int().positive(),
  games: z.array(gameSchema).min(1),
});
export type ReferenceData = z.infer<typeof referenceSchema>;
export type Game = z.infer<typeof gameSchema>;
export function localizedDescription(
  data: ReferenceData,
  language: ReferenceLanguage,
  game: Game,
) {
  const languageOrder =
    language === 'ja' ? ['ja', 'ja-Hrkt', 'en'] : [language, 'en'];
  for (const lang of languageOrder) {
    const entry = data.descriptions.find(
      (description) =>
        description.language === lang &&
        game.versions.includes(description.version),
    );
    if (entry) return { ...entry, gameMatches: true };
  }
  for (const lang of languageOrder) {
    const entry = data.descriptions.find(
      (description) => description.language === lang,
    );
    if (entry) return { ...entry, gameMatches: false };
  }
  return null;
}
export function gameMoves(
  data: ReferenceData,
  varietyId: number,
  gameId: number,
) {
  return (
    data.varieties
      .find((variety) => variety.id === varietyId)
      ?.moves.flatMap((move) =>
        move.learns
          .filter(([group]) => group === gameId)
          .map(([, method, level]) => ({ name: move.name, method, level })),
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) ||
          a.method.localeCompare(b.method) ||
          a.level - b.level,
      ) ?? []
  );
}
export function gameEncounters(
  data: ReferenceData,
  varietyId: number,
  game: Game,
) {
  return (
    data.varieties
      .find((variety) => variety.id === varietyId)
      ?.encounters.filter((encounter) =>
        game.versions.includes(encounter.version),
      ) ?? []
  );
}
