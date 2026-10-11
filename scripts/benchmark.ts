import { chromium, type Page } from '@playwright/test';
import { preview } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const output =
  process.argv.find((value) => value.startsWith('--output='))?.slice(9) ??
  'docs/performance-baseline.json';
const probeOnly = process.argv.includes('--probe-only');
const distRoot = path.resolve(
  process.argv.find((value) => value.startsWith('--dist='))?.slice(7) ??
    'dist/public',
);
const html = await readFile(path.join(distRoot, 'index.html'), 'utf8');
const modulePath =
  html.match(/src="([^"]+\/assets\/[^"]+\.js)"/)?.[1] ??
  html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
if (!modulePath) throw new Error('Build the client before benchmarking.');
const base = modulePath.slice(0, modulePath.indexOf('assets/'));
const httpRequests: string[] = [];
const server = await preview({
  configFile: false,
  plugins: [
    {
      name: 'benchmark-network-counter',
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          httpRequests.push(req.url ?? '');
          next();
        });
      },
    },
  ],
  root: path.resolve('client'),
  base,
  build: { outDir: distRoot },
  preview: { host: '127.0.0.1', port: 0 },
});
const address = server.httpServer.address();
if (!address || typeof address === 'string')
  throw new Error('Preview port unavailable');
const origin = `http://127.0.0.1:${address.port}`,
  url = `${origin}${base}`;
const browser = await chromium.launch();
const profile = {
  viewport: { width: 390, height: 844 },
  latencyMs: 150,
  downloadBitsPerSecond: 1600000,
  uploadBitsPerSecond: 750000,
  cpuSlowdown: 4,
};
interface Run {
  run: number;
  state: 'cold' | 'warm';
  firstResultsMs: number;
  mountedCards: number;
  resources: { path: string; transferredBytes: number; decodedBytes: number }[];
  searchMs: number;
  imageRequests: number;
  appTransferredBytes: number;
}
const runs: Run[] = [];
try {
  for (let run = 0; run < (probeOnly ? 0 : 3); run++) {
    const context = await browser.newContext({
      viewport: profile.viewport,
      serviceWorkers: 'block',
    });
    const requests: string[] = [];
    const page = await context.newPage();
    page.on('request', (request) => requests.push(request.url()));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', {
      urls: [
        '*://raw.githubusercontent.com/*',
        '*://play.pokemonshowdown.com/*',
      ],
    });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.latencyMs,
      downloadThroughput: profile.downloadBitsPerSecond / 8,
      uploadThroughput: profile.uploadBitsPerSecond / 8,
      connectionType: 'cellular4g',
    });
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: profile.cpuSlowdown,
    });
    for (const state of ['cold', 'warm'] as const) {
      if (state === 'warm')
        await page.evaluate(() =>
          history.replaceState(null, '', location.pathname + location.search),
        );
      requests.length = 0;
      if (state === 'cold')
        await page.goto(url, { waitUntil: 'domcontentloaded' });
      else await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () => document.querySelectorAll('.pokemon-card').length > 0,
      );
      const first = await page.evaluate(() => ({
        firstResultsMs: performance.now(),
        mountedCards: document.querySelectorAll('.pokemon-card').length,
        resources: (
          performance.getEntriesByType(
            'resource',
          ) as PerformanceResourceTiming[]
        )
          .concat(
            performance.getEntriesByType(
              'navigation',
            ) as PerformanceResourceTiming[],
          )
          .filter((resource) => resource.name.startsWith(location.origin))
          .map((resource) => ({
            path: new URL(resource.name).pathname,
            transferredBytes: resource.transferSize,
            decodedBytes: resource.decodedBodySize,
          })),
      }));
      await page.evaluate(() => {
        const input =
          document.querySelector<HTMLInputElement>('#catalogue-search')!;
        input.addEventListener(
          'input',
          () => {
            const started = performance.now();
            const observer = new MutationObserver(() => {
              if (
                document.querySelectorAll('.pokemon-card').length === 1 &&
                document.querySelector('.pokemon-card h3')?.textContent ===
                  'Pikachu'
              ) {
                document.documentElement.dataset.searchMs = String(
                  performance.now() - started,
                );
                observer.disconnect();
              }
            });
            observer.observe(document.getElementById('main')!, {
              childList: true,
              subtree: true,
            });
          },
          { once: true },
        );
      });
      await page.getByRole('searchbox').fill('25');
      await page.waitForFunction(() =>
        Boolean(document.documentElement.dataset.searchMs),
      );
      const searchMs = await page.evaluate(() =>
        Number(document.documentElement.dataset.searchMs),
      );
      runs.push({
        run: run + 1,
        state,
        ...first,
        searchMs,
        imageRequests: requests.filter((request) =>
          /\.(png|jpg|jpeg|webp)(\?|$)/.test(request),
        ).length,
        appTransferredBytes: first.resources.reduce(
          (total, resource) => total + resource.transferredBytes,
          0,
        ),
      });
      console.log(
        `Run ${run + 1} ${state}: results ${first.firstResultsMs.toFixed(0)}ms, search ${searchMs.toFixed(0)}ms, ${first.mountedCards} cards.`,
      );
    }
    await context.close();
  }
  const context = await browser.newContext({
    viewport: profile.viewport,
    serviceWorkers: 'allow',
  });
  httpRequests.length = 0;
  const catalogueRequests: { url: string; worker: boolean }[] = [];
  context.on('request', (request) => {
    if (request.url().includes('/catalogue.json'))
      catalogueRequests.push({
        url: request.url(),
        worker: Boolean(request.serviceWorker()),
      });
  });
  const page: Page = await context.newPage();
  const probeCdp = await context.newCDPSession(page);
  await probeCdp.send('Network.enable');
  await probeCdp.send('Network.setBlockedURLs', {
    urls: ['*://raw.githubusercontent.com/*', '*://play.pokemonshowdown.com/*'],
  });
  await page.goto(url);
  await page.waitForFunction(
    () => document.querySelectorAll('.pokemon-card').length === 40,
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  const median = (values: number[]) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const summary = probeOnly
    ? null
    : Object.fromEntries(
        ['cold', 'warm'].map((state) => [
          state,
          {
            firstResultsMs: median(
              runs
                .filter((run) => run.state === state)
                .map((run) => run.firstResultsMs),
            ),
            searchMs: median(
              runs
                .filter((run) => run.state === state)
                .map((run) => run.searchMs),
            ),
            transferredBytes: median(
              runs
                .filter((run) => run.state === state)
                .map((run) => run.appTransferredBytes),
            ),
          },
        ]),
      );
  const report = {
    generatedAt: new Date().toISOString(),
    browserVersion: browser.version(),
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    probeOnly,
    profile: probeOnly ? null : profile,
    methodology: probeOnly
      ? 'Unthrottled, fresh-context offline installation probe. Counts browser catalogue fetches and actual preview-server GET requests; cached fetches need not reach the server. No core timings or payload/card budgets are measured in this mode.'
      : 'Three cold browser contexts, each followed by a warm document reload in the same context with normal HTTP caching. Chromium page CDP throttling; service workers blocked for core measurements. Known artwork/cry hosts blocked via CDP to isolate application/data delivery without request interception disabling HTTP cache. Resource Timing transfer sizes include same-origin resources and navigation. Separate unthrottled service-worker installation probe counts browser requests and actual server requests; browser requests can be fulfilled by HTTP cache. Timings include automation polling and search debounce; these are lab diagnostics, not field Web Vitals, INP, Lighthouse scores or physical-device measurements.',
    summary,
    offlineInstallProbe: {
      catalogueRequests: catalogueRequests.map((request) => ({
        path: new URL(request.url).pathname,
        worker: request.worker,
      })),
      catalogueHttpRequests: httpRequests.filter((request) =>
        request.includes('/catalogue.json'),
      ).length,
    },
    runs,
  };
  const budgets = {
    coldApplicationBytes: 280 * 1024,
    mountedCards: 40,
    catalogueHttpRequests: 1,
  };
  const budgetChecks = {
    coldApplicationBytes: probeOnly
      ? null
      : runs
          .filter((run) => run.state === 'cold')
          .every(
            (run) => run.appTransferredBytes <= budgets.coldApplicationBytes,
          ),
    mountedCards: probeOnly
      ? null
      : runs.every((run) => run.mountedCards <= budgets.mountedCards),
    catalogueHttpRequests:
      report.offlineInstallProbe.catalogueHttpRequests <=
      budgets.catalogueHttpRequests,
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(
    output,
    JSON.stringify({ ...report, budgets, budgetChecks }, null, 2) + '\n',
  );
  console.log(
    JSON.stringify({
      summary,
      catalogueRequestCount: catalogueRequests.length,
      output,
    }),
  );
  await context.close();
  if (
    process.argv.includes('--check') &&
    Object.values(budgetChecks).some((passed) => passed === false)
  )
    throw new Error(
      'A deterministic performance guardrail failed. See the saved report.',
    );
} finally {
  await browser.close();
  await server.close();
}
