import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import {
  catalogueSchema,
  manifestSchema,
  pokemonTypes,
} from '../shared/schema';
import { filterPokemon, type Filters } from '../shared/pokemon';
import { catalogueIndex } from './lib/catalogue-index';

const manifest = manifestSchema.parse(
  JSON.parse(await readFile('client/public/data/manifest.json', 'utf8')),
);
const source = await readFile(
  `client/public/data/${manifest.version}/catalogue.json`,
);
const records = catalogueSchema.parse(JSON.parse(source.toString()));
assert.equal(records.length, manifest.recordCount);
const index = catalogueIndex(records);
const filters: Filters = {
  query: '',
  type: 'all',
  legendary: false,
  mythical: false,
  baby: false,
  sort: 'id',
};
let parityCases = 0;
function verify(values: Partial<Filters>) {
  const selected = { ...filters, ...values };
  assert.deepEqual(
    filterPokemon(index, selected).map((p) => p.speciesId),
    filterPokemon(records, selected).map((p) => p.speciesId),
  );
  parityCases++;
}
for (const record of records) {
  verify({ query: `#${record.speciesId}` });
  verify({ query: record.name });
  verify({ query: record.slug });
}
for (const type of ['all', ...pokemonTypes] as const)
  for (const sort of ['id', 'name', 'height', 'weight'] as const)
    for (let mask = 0; mask < 8; mask++)
      verify({
        type,
        sort,
        legendary: Boolean(mask & 1),
        mythical: Boolean(mask & 2),
        baby: Boolean(mask & 4),
      });
const bundle = await build({
  entryPoints: ['scripts/catalogue-evaluation-browser.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2022',
  minify: true,
});
const files = new Map<string, Buffer>([
  ['/harness.js', Buffer.from(bundle.outputFiles![0].contents)],
  ['/data/catalogue.json', source],
  ['/data/index.json', Buffer.from(JSON.stringify(index))],
]);
for (const record of records)
  files.set(
    `/data/details/${record.speciesId}.json`,
    Buffer.from(JSON.stringify(record)),
  );
const server = createServer((req, res) => {
  const pathname = new URL(req.url!, 'http://localhost').pathname;
  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end(
      '<!doctype html><html lang="en"><meta charset="utf-8"><title>Catalogue evaluation</title><body><script type="module" src="/harness.js"></script></body></html>',
    );
    return;
  }
  const file = files.get(pathname);
  if (!file) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    'Content-Type',
    pathname.endsWith('.js') ? 'text/javascript' : 'application/json',
  );
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(gzipSync(file));
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string')
  throw new Error('No evaluation port');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch();
const profile = {
  latencyMs: 150,
  downloadBitsPerSecond: 1600000,
  cpuSlowdown: 4,
};
const samples: Record<string, unknown>[] = [];
try {
  for (let run = 1; run <= 3; run++) {
    // Alternate ordering to limit systematic machine-load bias.
    for (const mode of run % 2 ? ['full', 'split'] : ['split', 'full']) {
      const context = await browser.newContext({
        serviceWorkers: 'block',
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: profile.latencyMs,
        downloadThroughput: profile.downloadBitsPerSecond / 8,
        uploadThroughput: 750000 / 8,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', {
        rate: profile.cpuSlowdown,
      });
      for (const state of ['cold', 'warm']) {
        await page.goto(`${origin}/?mode=${mode}`);
        await page.waitForFunction(() =>
          Boolean((window as unknown as { evaluation: unknown }).evaluation),
        );
        const metrics = await page.evaluate(() => {
          const result = (
            window as unknown as {
              evaluation: { readyMs: number; searchMs: number; count: number };
            }
          ).evaluation;
          return {
            readyMs: result.readyMs,
            searchMs: result.searchMs,
            count: result.count,
            dataTransferBytes: (
              performance.getEntriesByType(
                'resource',
              ) as PerformanceResourceTiming[]
            )
              .filter((r) => r.name.includes('/data/'))
              .reduce((sum, r) => sum + r.transferSize, 0),
          };
        });
        assert.equal(metrics.count, records.length);
        samples.push({ run, mode, state, ...metrics });
      }
      const workflows = [];
      for (const [name, ids] of [
        ['comparison', [25, 133]],
        ['team', [1, 6, 9, 25, 94, 149]],
      ] as const) {
        const result = await page.evaluate(
          async (ids) => {
            const api = (
              window as unknown as {
                evaluation: { details: (ids: number[]) => Promise<unknown[]> };
              }
            ).evaluation;
            const started = performance.now();
            const data = await api.details(ids);
            return { elapsedMs: performance.now() - started, data };
          },
          [...ids],
        );
        assert.deepEqual(
          result.data,
          ids.map((id) => records.find((p) => p.speciesId === id)),
        );
        workflows.push({ name, elapsedMs: result.elapsedMs });
      }
      await context.setOffline(true);
      await cdp.send('Network.emulateNetworkConditions', {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
      await page.evaluate(async () => {
        const api = (
          window as unknown as {
            evaluation: { details: (ids: number[]) => Promise<unknown[]> };
          }
        ).evaluation;
        await api.details([1, 25, 133]);
      });
      const unvisitedAvailable = await page.evaluate(async () => {
        try {
          await (
            window as unknown as {
              evaluation: { details: (ids: number[]) => Promise<unknown[]> };
            }
          ).evaluation.details([1025]);
          return true;
        } catch {
          return false;
        }
      });
      assert.equal(unvisitedAvailable, mode === 'full');
      samples.push({
        run,
        mode,
        workflows,
        offlineVisitedDetails: true,
        offlineUnvisitedDetails: unvisitedAvailable,
      });
      await context.close();
      console.log(`Evaluation ${run} ${mode} completed`);
    }
  }
  const size = (file: Buffer) => ({
    rawBytes: file.length,
    gzipBytes: gzipSync(file).length,
  });
  const detailFiles = [...files.entries()].filter(([name]) =>
    name.includes('/details/'),
  );
  const median = (values: number[]) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const summary = Object.fromEntries(
    ['full', 'split'].map((mode) => [
      mode,
      Object.fromEntries(
        ['cold', 'warm'].map((state) => {
          const rows = samples.filter(
            (s) => s.mode === mode && s.state === state,
          );
          return [
            state,
            Object.fromEntries(
              ['readyMs', 'searchMs', 'dataTransferBytes'].map((key) => [
                key,
                median(rows.map((row) => Number(row[key]))),
              ]),
            ),
          ];
        }),
      ),
    ]),
  );
  await writeFile(
    'docs/catalogue-evaluation.json',
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        snapshot: manifest.version,
        browserVersion: browser.version(),
        profile,
        methodology:
          'Data-path prototype only, not production UI or a replacement for the saved application baseline. Three fresh contexts per mode, each followed by a Cache API warm reload; normal HTTP caching enabled. Gzip local server, 150 ms latency, 1.6 Mbps download and 4x CPU slowdown. Minimal 40 text cards, no media, manifest or route shell. Shared production filter and Zod schemas bundled in the same harness. Comparison and team detail hydration follow warm index loading. Cache API tests cover visited/unvisited detail data only; no service-worker installation, offline navigation, eviction or update lifecycle is measured.',
        parityCases,
        payloads: {
          full: size(source),
          index: size(files.get('/data/index.json')!),
          allDetails: {
            files: detailFiles.length,
            rawBytes: detailFiles.reduce((n, [, file]) => n + file.length, 0),
            gzipBytes: detailFiles.reduce(
              (n, [, file]) => n + gzipSync(file).length,
              0,
            ),
          },
        },
        summary,
        samples,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
