import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
test.use({ serviceWorkers: 'allow' });
test('saved catalogue, visited forms and families, team, and quiz work after an offline reload', async ({
  page,
  context,
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
  await page.goto('./#/pokemon/6');
  await expect(
    page.getByLabel('Pokémon variety', { exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole('heading', {
      name: 'Reference for Scarlet Violet',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('./#/evolution?pokemon=1');
  await expect(
    page.getByRole('heading', { name: 'Bulbasaur family' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await caches.keys()).filter((key) => key.endsWith(':data')).length,
      ),
    )
    .toBeGreaterThan(0);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Bulbasaur family' }),
  ).toBeVisible();
  await expect(page.getByText(/Offline. Saved catalogue data/)).toBeVisible();
  await page.goto('./#/pokemon/6');
  await expect(
    page.getByLabel('Pokémon variety', { exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('combobox', { name: 'Names and descriptions language' })
    .selectOption('ja');
  await expect(
    page.getByRole('heading', { name: 'リザードン', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Reference for Scarlet Violet',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('./#/team?team=6,25,0,0,0,0');
  await expect(page.getByRole('table')).toBeVisible();
  await page.goto('./#/discover');
  await page.getByRole('button', { name: 'Type quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await expect(page.locator('.quiz-options button')).toHaveCount(4);
  await page.goto('./#/pokemon/999');
  await expect(
    page.getByText(/Saved varieties could not be loaded/),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Gimmighoul', exact: true }),
  ).toBeVisible();
  const counts = await page.evaluate(async () =>
    Promise.all(
      (await caches.keys())
        .filter((key) => key.endsWith(':data') || key.endsWith(':media'))
        .map(async (key) => ({
          key,
          count: (await (await caches.open(key)).keys()).length,
        })),
    ),
  );
  for (const entry of counts)
    expect(entry.count).toBeLessThanOrEqual(
      entry.key.endsWith(':data') ? 40 : 32,
    );
});
test('a new worker waits for an explicit update and retains the preceding cache version', async ({
  page,
}) => {
  await page.goto('./');
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
  const file = 'dist/public/sw.js',
    original = await readFile(file, 'utf8');
  try {
    await writeFile(
      file,
      original.replace(
        /const VERSION="[a-f0-9]+"/,
        'const VERSION="000000000000abcd"',
      ),
    );
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg!.update();
    });
    await expect(
      page.getByRole('button', { name: 'Reload to update', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Reload to update', exact: true })
      .click();
    await expect(page.locator('.pokemon-card')).toHaveCount(40);
    await expect(
      page.getByRole('button', { name: 'Reload to update', exact: true }),
    ).not.toBeVisible();
    const keys = await page.evaluate(() => caches.keys());
    expect(keys.some((key) => key.includes('000000000000abcd:core'))).toBe(
      true,
    );
    expect(keys.filter((key) => key.endsWith(':core'))).toHaveLength(2);
  } finally {
    await writeFile(file, original);
  }
});
