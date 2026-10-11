import { test, expect } from '@playwright/test';
test.use({ hasTouch: true });
test('favorites and caught work by tap and keyboard, persist, filter and export/import', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/pokemon/25');
  const favorite = page.getByRole('button', {
    name: 'Favorite Pikachu',
    exact: true,
  });
  await favorite.focus();
  await page.keyboard.press('Space');
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Caught Pikachu', exact: true }).tap();
  await page.reload();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Pokédex', exact: true }).click();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(page.locator('.pokemon-card')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Pikachu', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('.pokemon-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Caught', exact: true }).click();
  await expect(page.locator('.pokemon-card')).toHaveCount(1);
  await page.getByText(/Collection backup ·/).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export collection' }).click();
  expect((await download).suggestedFilename()).toBe(
    'pokemonpedia-collection.json',
  );
  const file = page.getByLabel('Collection JSON file');
  await file.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('invalid'),
  });
  await expect(page.getByRole('alert')).toContainText(
    'Choose a PokemonPedia collection file',
  );
  await expect(page.locator('.pokemon-card')).toHaveCount(1);
  await file.setInputFiles({
    name: 'collection.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ schemaVersion: 1, favorites: [133], caught: [1] }),
    ),
  });
  await expect(
    page.getByText('Imported choices were added to your collection.'),
  ).toBeVisible();
  await expect(page.locator('.pokemon-card')).toHaveCount(2);
  await page.getByLabel('Import behavior').selectOption('replace');
  await file.setInputFiles({
    name: 'collection.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ schemaVersion: 1, favorites: [133], caught: [] }),
    ),
  });
  await expect(
    page.getByText('Your collection was replaced with the imported choices.'),
  ).toBeVisible();
  await expect(page.locator('.pokemon-card')).toHaveCount(0);
});
test('blocked storage preserves session actions and explains the limitation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new Error('Blocked');
      },
    });
  });
  await page.goto('./#/pokemon/25');
  await page
    .getByRole('button', { name: 'Favorite Pikachu', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Favorite Pikachu', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/session only/)).toBeVisible();
});
test('200 percent text size keeps catalogue and collection controls within the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('.pokemon-card')).toHaveCount(40);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole('button', { name: 'Favorite Bulbasaur', exact: true }),
  ).toBeVisible();
});
