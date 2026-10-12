import { test, expect } from '@playwright/test';
test('catalogue search, bounded cards, reset, keyboard details and URL refresh', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('pageerror', (error) => errors.push(error.message));
  const started = Date.now();
  await page.goto('./');
  await expect(page.locator('.pokemon-card')).toHaveCount(40);
  expect(
    requests.some(
      (url) => url.includes('/api/') || url.startsWith('https://pokeapi.co/'),
    ),
  ).toBe(false);
  const firstResultsMs = Date.now() - started;
  const transfer = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => {
        const r = entry as PerformanceResourceTiming;
        return { name: r.name, bytes: r.transferSize };
      })
      .filter((r) => r.name.startsWith(location.origin)),
  );
  await testInfo.attach('cold-catalogue-metrics', {
    body: JSON.stringify(
      { firstResultsMs, mountedCards: 40, transfer },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  await page.getByRole('button', { name: 'Load 40 more' }).click();
  await expect(page.locator('.pokemon-card')).toHaveCount(80);
  await page.getByRole('searchbox').fill(' #025 ');
  await expect(page.locator('.pokemon-card')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Pikachu', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'View Pikachu details' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/pokemon\/25$/);
  await expect(page.getByRole('button', { name: 'Play cry' })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Pikachu', exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue(' #025 ');
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await expect(page.locator('.pokemon-card')).toHaveCount(40);
  await expect(page.getByRole('searchbox')).toHaveValue('');
  expect(errors).toEqual([]);
});
test('filter keyboard semantics and empty recovery', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.pokemon-card')).toHaveCount(40);
  await page.getByText('Filters', { exact: true }).click();
  const fire = page.getByRole('button', { name: 'fire', exact: true });
  await fire.focus();
  await page.keyboard.press('Space');
  await expect(fire).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('checkbox', { name: 'legendary', exact: true }).check();
  await expect(page.locator('.pokemon-card')).not.toHaveCount(0);
  await page.getByRole('searchbox').fill('does-not-exist');
  await expect(
    page.getByText('No Pokémon found. Try adjusting your filters.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear all filters' }).first().click();
  await expect(page.locator('.pokemon-card')).toHaveCount(40);
});

test('a pending catalogue search cannot change a slowly loading detail URL', async ({
  page,
}) => {
  await page.route('**/assets/Detail-*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('./');
  await expect(page.locator('.pokemon-card')).toHaveCount(40);
  await page.getByRole('searchbox').fill('bulba');
  await page
    .getByRole('link', { name: 'View Bulbasaur details', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Bulbasaur', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#\/pokemon\/1$/);
});
test('comparison preselection, searchable keyboard selector, swap and reload', async ({
  page,
}) => {
  await page.goto('./#/compare?first=25');
  await page
    .getByRole('searchbox', { name: 'Second Pokémon', exact: true })
    .fill('133');
  const select = page.getByRole('combobox', {
    name: 'Choose second pokémon',
    exact: true,
  });
  await select.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Base stat comparison' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/second=133/);
  await page.getByRole('button', { name: 'Swap', exact: true }).click();
  await expect(page).toHaveURL(/first=133.*second=25/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Base stat comparison' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear both' }).click();
  await expect(
    page.getByText('Select two Pokémon to compare them side by side.'),
  ).toBeVisible();
});
test('evolution branches, baby order, failures and selection races', async ({
  page,
}) => {
  await page.goto('./#/evolution?pokemon=133');
  await expect(
    page.getByRole('heading', { name: 'Eevee family' }),
  ).toBeVisible();
  await expect(
    page.locator('.evolution-tree > li > .evolution-children > li'),
  ).toHaveCount(8);
  await page.getByRole('button', { name: 'Pichu', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Pichu family' }),
  ).toBeVisible();
  await expect(
    page.locator('.evolution-tree > li > .evolution-member h3'),
  ).toHaveText('Pichu');
  await page.route('**/evolution/1.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ status: 503, body: '{}' });
  });
  await page.getByRole('button', { name: 'Bulbasaur', exact: true }).click();
  await page.getByRole('button', { name: 'Eevee', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Eevee family' }),
  ).toBeVisible();
  await page.waitForTimeout(800);
  await expect(
    page.getByRole('heading', { name: 'Eevee family' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bulbasaur', exact: true }).click();
  await expect(
    page.getByText('This evolution family could not be loaded.'),
  ).toBeVisible();
  await page.unroute('**/evolution/1.json');
  await page.getByRole('button', { name: 'Retry family' }).click();
  await expect(
    page.getByRole('heading', { name: 'Bulbasaur family' }),
  ).toBeVisible();
});
test('catalogue failure is retryable and never shows a zero-results state', async ({
  page,
}) => {
  await page.route('**/data/manifest.json', (route) =>
    route.fulfill({ status: 503, body: '{}' }),
  );
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText(
    'The saved catalogue could not be loaded',
  );
  await expect(
    page.getByText('No Pokémon found. Try adjusting your filters.'),
  ).not.toBeVisible();
  await page.unroute('**/data/manifest.json');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.pokemon-card')).toHaveCount(40);
});
test('responsive pages and image fallback', async ({ page }, testInfo) => {
  const capture = `${process.env.VITE_COMPACT_CATALOGUE === '1' ? 'compact' : 'standard'}-${testInfo.project.name}`;
  test.setTimeout(60000);
  await page.route('**/*.{png,jpg,jpeg}', (route) => route.abort());
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      './',
      './#/compare?first=25&second=133',
      './#/evolution?pokemon=133',
    ]) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
    }
  }
  await expect(
    page.getByRole('img', {
      name: 'Artwork unavailable for Eevee',
      exact: true,
    }),
  ).toBeVisible();
  await page.unroute('**/*.{png,jpg,jpeg}');
  await page.goto('./#/evolution?pokemon=133');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Eevee family' }),
  ).toBeVisible();
  await page.getByRole('img', { name: /Eevee/ }).first().waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: `tmp/review/${capture}-implemented-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('.pokemon-card')).toHaveCount(40);
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: `tmp/review/${capture}-implemented-mobile.png`,
    fullPage: false,
  });
});
