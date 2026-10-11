import { z } from 'zod';
import { pokemonSchema } from './schema';
export const formsSchema = z
  .object({
    speciesId: z.number().int().positive(),
    forms: z.array(pokemonSchema).min(1),
  })
  .refine(
    (data) =>
      data.forms.every((form) => form.speciesId === data.speciesId) &&
      new Set(data.forms.map((form) => form.id)).size === data.forms.length &&
      data.forms.filter((form) => form.isDefault).length === 1,
    'Invalid species varieties',
  );
export const formsManifestSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.string().regex(/^[a-f0-9]{16}$/),
  generatedAt: z.string().datetime(),
  speciesCount: z.number().int().positive(),
  formCount: z.number().int().positive(),
});
