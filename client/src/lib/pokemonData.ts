import { useQuery } from '@tanstack/react-query';
import {
  catalogueSchema,
  manifestSchema,
  evolutionNodeSchema,
  type Manifest,
} from '@shared/schema';
import { formsSchema, formsManifestSchema } from '@shared/forms';
import { referenceSchema, referenceManifestSchema } from '@shared/reference';
import {
  compactCatalogueFilename,
  decodeCompactCatalogue,
} from '@shared/compact-catalogue';
export async function fetchJson(
  file: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`, {
    signal,
  });
  if (!response.ok)
    throw new Error(
      'The saved Pokémon data could not be loaded. Please try again.',
    );
  return response.json();
}
export function useCatalogue() {
  return useQuery({
    queryKey: ['catalogue'],
    queryFn: async ({ signal }) => {
      const manifest = manifestSchema.parse(
        await fetchJson('manifest.json', signal),
      );
      const compact =
        import.meta.env.PROD && import.meta.env.VITE_COMPACT_CATALOGUE === '1';
      const data = await fetchJson(
        `${manifest.version}/${compact ? compactCatalogueFilename : 'catalogue.json'}`,
        signal,
      );
      const pokemon = compact
        ? decodeCompactCatalogue(data)
        : catalogueSchema.parse(data);
      if (pokemon.length !== manifest.recordCount)
        throw new Error('The saved catalogue is incomplete. Please try again.');
      return { manifest, pokemon };
    },
  });
}
export function useEvolution(
  manifest: Manifest | undefined,
  chainId: number | null | undefined,
) {
  return useQuery({
    queryKey: ['evolution', manifest?.version, chainId],
    enabled: Boolean(manifest && chainId),
    queryFn: async ({ signal }) =>
      evolutionNodeSchema.parse(
        await fetchJson(
          `${manifest!.version}/evolution/${chainId}.json`,
          signal,
        ),
      ),
  });
}
export function useForms(speciesId: number | undefined) {
  return useQuery({
    queryKey: ['forms', speciesId],
    enabled: Boolean(speciesId),
    queryFn: async ({ signal }) => {
      const manifest = formsManifestSchema.parse(
        await fetchJson('forms/manifest.json', signal),
      );
      const forms = formsSchema.parse(
        await fetchJson(`forms/${manifest.version}/${speciesId}.json`, signal),
      );
      if (forms.speciesId !== speciesId) throw new Error('Incorrect form data');
      return forms;
    },
  });
}
export function useReference(speciesId: number | undefined) {
  return useQuery({
    queryKey: ['reference', speciesId],
    enabled: Boolean(speciesId),
    queryFn: async ({ signal }) => {
      const manifest = referenceManifestSchema.parse(
        await fetchJson('reference/manifest.json', signal),
      );
      const data = referenceSchema.parse(
        await fetchJson(
          `reference/${manifest.version}/${speciesId}.json`,
          signal,
        ),
      );
      if (data.speciesId !== speciesId)
        throw new Error('Incorrect reference species');
      return { manifest, data };
    },
  });
}
