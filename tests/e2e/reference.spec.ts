import { test, expect } from '@playwright/test';
test('localized names and descriptions preserve game and language in the URL', async ({
  page,
}) => {
  await page.goto('./#/pokemon/6?lang=fr&game=x-y');
  await expect(
    page.getByRole('heading', { name: 'Dracaufeu', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.pokemon-summary .description')).toHaveAttribute(
    'lang',
    'fr',
  );
  await expect(
    page.getByRole('heading', { name: 'Reference for X Y' }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Names and descriptions language' })
    .selectOption('ja');
  await expect(
    page.getByRole('heading', { name: 'リザードン', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'リザードン', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Game group', exact: true })
    .selectOption('red-blue');
  await expect(
    page.getByRole('heading', { name: 'Reference for Red Blue' }),
  ).toBeVisible();
  await page.getByRole('searchbox', { name: 'Find a move' }).fill('ember');
  await expect(
    page.getByRole('rowheader', { name: 'Ember', exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Names and descriptions language' })
    .selectOption('fr');
  await expect(page.locator('.reference-context')).toContainText(
    'requested description language is unavailable',
  );
  await expect(page.locator('.pokemon-summary .description')).toHaveAttribute(
    'lang',
    'en',
  );
  await page
    .getByRole('link', { name: 'Evolution family', exact: true })
    .click();
  await expect(page).toHaveURL(/game=red-blue/);
  await expect(
    page.getByText(/Selected rules context: Red Blue/),
  ).toBeVisible();
});
test('reference failure is retryable, unsupported selections are explained, and narrow layouts fit', async ({
  page,
}) => {
  await page.route('**/reference/*/25.json', (route) =>
    route.fulfill({ status: 503, body: '{}' }),
  );
  await page.goto('./#/pokemon/25');
  await expect(
    page.getByText(/Language and game reference could not be loaded/),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Pikachu', exact: true }),
  ).toBeVisible();
  await page.unroute('**/reference/*/25.json');
  await page.getByRole('button', { name: 'Retry reference' }).click();
  await expect(
    page.getByRole('heading', { name: 'Reference for Scarlet Violet' }),
  ).toBeVisible();
  await page.goto('./#/pokemon/25?lang=unsupported&game=unsupported');
  await expect(
    page.getByText(/requested language is unsupported/),
  ).toBeVisible();
  await expect(
    page.getByText(/requested game group is unavailable/),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
});
