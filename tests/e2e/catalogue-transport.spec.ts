import { test, expect } from './fixtures';
import { readdir, readFile } from 'node:fs/promises';

const cataloguePattern = /\/catalogue(?:\.compact-v1)?\.json$/;
test('invalid catalogue transport is retryable without presenting partial results', async ({
  page,
}) => {
  await page.route(cataloguePattern, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"schemaVersion":1,"rows":[[]]}',
    }),
  );
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText(
    'The saved catalogue could not be loaded',
  );
  await expect(page.locator('.pokemon-card')).toHaveCount(0);
  await page.unroute(cataloguePattern);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.pokemon-card')).toHaveCount(40);
});

test.describe('complete offline transport', () => {
  test.use({ serviceWorkers: 'allow' });
  test('unvisited summaries and comparison survive reload while visited data evicts at forty', async ({
    page,
    setOriginOffline,
  }) => {
    await page.goto('./');
    await expect(page.locator('.pokemon-card')).toHaveCount(40);
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
    const coreFiles = await page.evaluate(async () => {
      const key = (await caches.keys()).find((key) => key.endsWith(':core'))!;
      return (await (await caches.open(key)).keys()).map(
        (request) => request.url,
      );
    });
    expect(coreFiles.filter((url) => cataloguePattern.test(url))).toHaveLength(
      1,
    );
    const manifest = JSON.parse(
      await readFile('client/public/data/manifest.json', 'utf8'),
    );
    const families = (
      await readdir(`client/public/data/${manifest.version}/evolution`)
    )
      .filter((name) => name.endsWith('.json'))
      .sort()
      .slice(0, 45);
    await page.evaluate(
      async ({ version, families }) => {
        for (const family of families) {
          const response = await fetch(`data/${version}/evolution/${family}`);
          if (!response.ok) throw new Error('Could not warm saved family');
          await response.json();
        }
      },
      { version: manifest.version, families },
    );
    const visitedFiles = await page.evaluate(async () => {
      const key = (await caches.keys()).find((key) => key.endsWith(':data'))!;
      return (await (await caches.open(key)).keys()).map(
        (request) => request.url,
      );
    });
    expect(visitedFiles).toHaveLength(40);
    expect(
      visitedFiles.some((url) => url.endsWith(`/evolution/${families[0]}`)),
    ).toBe(false);
    expect(
      visitedFiles.some((url) => url.endsWith(`/evolution/${families.at(-1)}`)),
    ).toBe(true);
    await setOriginOffline();
    await page.goto('./#/compare?first=25&second=133');
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Base stat comparison' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('row')
        .filter({
          has: page.getByRole('rowheader', { name: 'Hp', exact: true }),
        })
        .getByRole('cell'),
    ).toHaveText(['35', '55', '-20']);
    await page.goto('./#/team?team=6,25,133,149,94,1025');
    await expect(page.getByRole('table')).toBeVisible();
    await page.goto('./#/pokemon/999');
    await expect(
      page.getByRole('heading', { name: 'Gimmighoul', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Saved varieties could not be loaded', { exact: false }),
    ).toBeVisible();
    await expect(page.locator('.base-stats .stat-total dd')).toHaveText('300');
  });
});
