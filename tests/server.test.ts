import { it, expect, vi } from 'vitest';
import express from 'express';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { registerRoutes } from '../server/routes';
import { handleError } from '../server/errors';
it('rejects malformed pagination and survives a failed family request', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pokemonpedia-api-'));
  const manifest = JSON.parse(
    await readFile('client/public/data/manifest.json', 'utf8'),
  );
  const record = JSON.parse(
    await readFile(
      `client/public/data/${manifest.version}/catalogue.json`,
      'utf8',
    ),
  )[0];
  await mkdir(path.join(root, manifest.version));
  await writeFile(
    path.join(root, 'manifest.json'),
    JSON.stringify({
      ...manifest,
      recordCount: 1,
      expectedCount: 1,
      missingIds: [],
    }),
  );
  await writeFile(
    path.join(root, manifest.version, 'catalogue.json'),
    JSON.stringify([record]),
  );
  const app = express(),
    server = await registerRoutes(app, root);
  app.use(handleError);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing test port');
  const base = `http://127.0.0.1:${address.port}`;
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    for (const query of [
      'limit=-1',
      'offset=-1',
      'limit=abc',
      'limit=1.5',
      'limit=9999999',
      'offset=9999999',
      'limit=1&limit=2',
    ])
      expect((await fetch(`${base}/api/pokemon?${query}`)).status).toBe(400);
    expect((await fetch(`${base}/api/evolution-chain/not-an-id`)).status).toBe(
      400,
    );
    expect((await fetch(`${base}/api/evolution-chain/99999`)).status).toBe(404);
    expect(
      (await fetch(`${base}/api/evolution-chain/${record.evolutionChainId}`))
        .status,
    ).toBe(500);
    expect((await fetch(`${base}/health`)).status).toBe(200);
    const responses = await Promise.all([
      fetch(`${base}/api/pokemon`),
      fetch(`${base}/api/pokemon`),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([record]);
    }
    expect(log).toHaveBeenCalledTimes(1);
  } finally {
    log.mockRestore();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
