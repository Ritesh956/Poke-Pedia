// Evaluation only: this schema is not published or used by the application.
import { z } from 'zod';
import { pokemonSchema, type Pokemon } from '../../shared/schema';

export const indexRecordSchema = pokemonSchema.pick({
  speciesId: true,
  name: true,
  slug: true,
  types: true,
  height: true,
  weight: true,
  isLegendary: true,
  isMythical: true,
  isBaby: true,
  imageUrl: true,
  description: true,
});
export const indexSchema = z.array(indexRecordSchema);
export function catalogueIndex(records: Pokemon[]) {
  return indexSchema.parse(records);
}
