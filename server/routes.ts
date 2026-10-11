import type { Express } from 'express';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  catalogueSchema,
  manifestSchema,
  evolutionNodeSchema,
  pokemonTypes,
  type PokemonType,
} from '../shared/schema';
export async function registerRoutes(app: Express, snapshotRoot?: string) {
  const dataRoot =
    snapshotRoot ??
    path.resolve(
      import.meta.dirname,
      process.env.NODE_ENV === 'production'
        ? 'public/data'
        : '../client/public/data',
    );
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(dataRoot, 'manifest.json'), 'utf8')),
  );
  const records = catalogueSchema.parse(
    JSON.parse(
      await readFile(
        path.join(dataRoot, manifest.version, 'catalogue.json'),
        'utf8',
      ),
    ),
  );
  if (records.length !== manifest.recordCount)
    throw new Error('Incomplete saved snapshot');
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/ready', (_req, res) => res.json({ ready: true, ...manifest }));
  app.get('/api/types', (_req, res) => res.json(pokemonTypes));
  app.get('/api/pokemon', (req, res) => {
    const integer = (value: unknown, fallback: number, max: number) =>
      value === undefined
        ? fallback
        : typeof value === 'string' &&
            /^\d+$/.test(value) &&
            Number.isSafeInteger(Number(value)) &&
            Number(value) <= max
          ? Number(value)
          : NaN;
    const limit = integer(req.query.limit, records.length, 2000),
      offset = integer(req.query.offset, 0, records.length);
    if (!Number.isFinite(limit) || limit < 1 || !Number.isFinite(offset))
      return res.status(400).json({
        message:
          'Use a positive limit up to 2000 and a nonnegative offset within the catalogue.',
      });
    res.json(records.slice(offset, offset + limit));
  });
  app.get('/api/pokemon/types/:type', (req, res) => {
    if (!pokemonTypes.includes(req.params.type as PokemonType))
      return res.status(400).json({ message: 'Invalid Pokémon type' });
    res.json(
      records.filter((p) => p.types.includes(req.params.type as PokemonType)),
    );
  });
  app.get('/api/evolution-chain/:id', async (req, res, next) => {
    if (
      !/^[1-9]\d*$/.test(req.params.id) ||
      !Number.isSafeInteger(Number(req.params.id))
    )
      return res.status(400).json({ message: 'Invalid chain ID' });
    if (!records.some((p) => p.evolutionChainId === Number(req.params.id)))
      return res.status(404).json({ message: 'Family not in snapshot' });
    try {
      res.json(
        evolutionNodeSchema.parse(
          JSON.parse(
            await readFile(
              path.join(
                dataRoot,
                manifest.version,
                'evolution',
                `${req.params.id}.json`,
              ),
              'utf8',
            ),
          ),
        ),
      );
    } catch (error) {
      next(error);
    }
  });
  app.use('/api', (_req, res) =>
    res.status(404).json({ message: 'Unknown API route' }),
  );
  return createServer(app);
}
