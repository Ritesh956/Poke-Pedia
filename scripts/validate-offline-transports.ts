import { build } from 'vite';
import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { transportPreview, type CatalogueMode } from './lib/transport-preview';

const scratch = path.resolve('tmp/review/offline-transports');
const reuseBuilds = process.argv.includes('--reuse-builds');
const builds = {
  standard: path.join(scratch, 'standard'),
  compact: path.join(scratch, 'compact'),
};
const versions: Partial<Record<CatalogueMode, string>> = {};
const originalFlag = process.env.VITE_COMPACT_CATALOGUE,
  originalBase = process.env.VITE_BASE_PATH;
await mkdir(scratch, { recursive: true });
try {
  process.env.VITE_BASE_PATH = '/PokemonPedia/';
  for (const mode of ['standard', 'compact'] as const) {
    process.env.VITE_COMPACT_CATALOGUE = mode === 'compact' ? '1' : '0';
    if (!reuseBuilds)
      await build({ build: { outDir: builds[mode], emptyOutDir: true } });
    const source = await readFile(path.join(builds[mode], 'sw.js'), 'utf8');
    const version = source.match(/const VERSION="([a-f0-9]{16})"/)?.[1];
    if (!version) throw new Error('Missing generated worker version');
    versions[mode] = version;
  }
} finally {
  if (originalFlag === undefined) delete process.env.VITE_COMPACT_CATALOGUE;
  else process.env.VITE_COMPACT_CATALOGUE = originalFlag;
  if (originalBase === undefined) delete process.env.VITE_BASE_PATH;
  else process.env.VITE_BASE_PATH = originalBase;
}
const server = await transportPreview(builds);
let browser: Browser | undefined;
const migrations: Record<string, unknown>[] = [],
  installations: Record<string, unknown>[] = [];
const externalMedia = [
  '*://raw.githubusercontent.com/*',
  '*://play.pokemonshowdown.com/*',
];
async function workerReady(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      );
  });
}
async function offlineWorkflows(page: Page) {
  await page.goto(`${server.url}#/compare?first=25&second=133`);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Base stat comparison' }),
  ).toBeVisible();
  await expect(
    page.locator('.stat-comparison tbody tr').first().locator('td'),
  ).toHaveText(['35', '55', '-20']);
  await page.goto(`${server.url}#/team?team=6,25,133,149,94,1025`);
  await expect(page.getByRole('table')).toBeVisible();
  await page.goto(`${server.url}#/pokemon/999`);
  await expect(
    page.getByRole('heading', { name: 'Gimmighoul', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.base-stats .stat-total dd')).toHaveText('300');
}
try {
  browser = await chromium.launch();
  for (const from of ['standard', 'compact'] as const) {
    const to = from === 'standard' ? 'compact' : 'standard';
    server.select(from);
    server.shape(null);
    server.reset();
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage(),
      cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', { urls: externalMedia });
    await page.goto(server.url);
    await expect(page.locator('.pokemon-card')).toHaveCount(40);
    await workerReady(page);
    await page
      .getByRole('button', { name: 'Favorite Bulbasaur', exact: true })
      .click();
    server.select(to);
    let failedUpdateRecovered = false;
    if (from === 'standard') {
      server.fail(/\/catalogue\.compact-v1\.json$/);
      await page.evaluate(async () => {
        const registration = (await navigator.serviceWorker.getRegistration())!;
        registration.addEventListener(
          'updatefound',
          () => {
            const worker = registration.installing!;
            worker.addEventListener('statechange', () => {
              if (worker.state === 'redundant')
                document.documentElement.dataset.failedInstall = 'true';
            });
          },
          { once: true },
        );
        await registration.update();
      });
      await page.waitForFunction(
        () => document.documentElement.dataset.failedInstall === 'true',
      );
      const active = await page.evaluate(async () => ({
        active: (await navigator.serviceWorker.getRegistration())?.active
          ?.state,
        waiting: Boolean(
          (await navigator.serviceWorker.getRegistration())?.waiting,
        ),
      }));
      assert.deepEqual(active, { active: 'activated', waiting: false });
      await expect(page.locator('.pokemon-card')).toHaveCount(40);
      await context.setOffline(true);
      await page.reload();
      await expect(page.locator('.pokemon-card')).toHaveCount(40);
      await context.setOffline(false);
      server.fail(null);
      failedUpdateRecovered = true;
    }
    await page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistration())!.update(),
    );
    await expect(
      page.getByRole('button', { name: 'Reload to update', exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const beforeApply = await page.evaluate(async () => {
      const registration = (await navigator.serviceWorker.getRegistration())!;
      return {
        waiting: registration.waiting?.state,
        caches: await caches.keys(),
      };
    });
    assert.equal(beforeApply.waiting, 'installed');
    await page
      .getByRole('button', { name: 'Reload to update', exact: true })
      .click();
    await expect(page.locator('.pokemon-card')).toHaveCount(40);
    await expect(
      page.getByRole('button', { name: 'Favorite Bulbasaur', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    const state = await page.evaluate(async (version) => {
      const keys = await caches.keys();
      const core = keys.find((key) => key.includes(`${version}:core`))!;
      return {
        cores: keys.filter((key) => key.endsWith(':core')),
        files: (await (await caches.open(core)).keys()).map(
          (request) => request.url,
        ),
      };
    }, versions[to]!);
    assert.equal(state.cores.length, 2);
    assert.ok(
      state.cores.some((key) => key.includes(`${versions[from]}:core`)),
    );
    const chosen = state.files.filter((url) =>
      /\/catalogue(?:\.compact-v1)?\.json$/.test(url),
    );
    assert.equal(chosen.length, 1);
    assert.equal(
      chosen[0].endsWith('/catalogue.compact-v1.json'),
      to === 'compact',
    );
    await context.setOffline(true);
    await offlineWorkflows(page);
    migrations.push({
      from,
      to,
      explicitReload: true,
      collectionPreserved: true,
      previousCoreRetained: true,
      offlineWorkflows: true,
      failedUpdateRecovered,
      requests: [...server.requests],
    });
    await context.close();
    console.log(`Migration ${from} to ${to} passed`);
  }
  await writeFile(
    path.join(scratch, 'migration-results.json'),
    JSON.stringify({ versions, migrations }, null, 2) + '\n',
  );
  const profile = { latencyMs: 150, downloadBitsPerSecond: 1600000 };
  for (const mode of ['standard', 'compact'] as const) {
    server.select(mode);
    server.shape(profile);
    for (let run = 1; run <= 3; run++) {
      server.reset();
      const context = await browser.newContext({
        serviceWorkers: 'allow',
        viewport: { width: 390, height: 844 },
      });
      const requests: { path: string; worker: boolean }[] = [];
      context.on('request', (request) => {
        if (request.url().startsWith(server.url))
          requests.push({
            path: new URL(request.url()).pathname,
            worker: Boolean(request.serviceWorker()),
          });
      });
      const page = await context.newPage(),
        cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setBlockedURLs', { urls: externalMedia });
      const started = performance.now();
      await page.goto(server.url);
      await expect(page.locator('.pokemon-card')).toHaveCount(40);
      const firstResultsMs = performance.now() - started;
      await workerReady(page);
      const readyMs = performance.now() - started;
      const completedRequests = [...server.requests];
      const catalogueHttpRequests = completedRequests.filter((request) =>
        /\/catalogue(?:\.compact-v1)?\.json$/.test(request.path),
      ).length;
      assert.equal(catalogueHttpRequests, 1);
      assert.ok(
        completedRequests.every(
          (request) => request.shaped && [200, 304].includes(request.status),
        ),
        JSON.stringify(
          completedRequests.filter(
            (request) =>
              ![200, 304].includes(request.status) || !request.shaped,
          ),
        ),
      );
      assert.ok(
        requests.some(
          (request) => request.worker && request.path.includes('/assets/'),
        ),
      );
      await context.setOffline(true);
      await page.reload();
      await expect(page.locator('.pokemon-card')).toHaveCount(40);
      await offlineWorkflows(page);
      installations.push({
        mode,
        run,
        firstResultsMs,
        readyMs,
        bodyBytes: completedRequests.reduce(
          (sum, request) => sum + request.bodyBytes,
          0,
        ),
        catalogueHttpRequests,
        offlineReload: true,
        offlineWorkflows: true,
        requests: completedRequests,
        browserRequests: requests,
      });
      await context.close();
      console.log(`Global installation ${mode} ${run} passed`);
    }
  }
  const median = (values: number[]) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const summary = Object.fromEntries(
    ['standard', 'compact'].map((mode) => {
      const rows = installations.filter((sample) => sample.mode === mode);
      return [
        mode,
        {
          firstResultsMs: median(rows.map((row) => Number(row.firstResultsMs))),
          readyMs: median(rows.map((row) => Number(row.readyMs))),
          bodyBytes: median(rows.map((row) => Number(row.bodyBytes))),
        },
      ];
    }),
  );
  await writeFile(
    'docs/transport-offline-validation.json',
    JSON.stringify(
      {
        reuseBuilds,
        generatedAt: new Date().toISOString(),
        browserVersion: browser.version(),
        versions,
        profile,
        methodology:
          'Two actual built representations share one proxy origin. Both migration directions use real worker scripts, waiting state, explicit reload, previous-core retention, collection persistence and offline summary/comparison/team checks. Standard-to-compact also forces a 503 catalogue install failure, verifies the active snapshot survives offline reload, then retries successfully. Installation uses three fresh contexts per mode, with 150 ms added response latency and shared 1.6 Mbps response-body pacing across all same-origin page and service-worker requests. Media is blocked, CPU and upload are unshaped, TCP congestion is not simulated. Totals are proxy-observed body bytes through readiness, excluding headers and cached browser responses. Timings include automation; these are local Chromium/Vite-preview diagnostics, not physical-device or field results. All individual request logs are retained.',
        summary,
        migrations,
        installations,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser?.close();
  await server.close();
}
