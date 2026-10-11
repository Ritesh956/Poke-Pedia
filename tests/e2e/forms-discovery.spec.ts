import { test, expect } from '@playwright/test';
test('switches matching form data, preserves URL state, and falls back from shiny artwork', async ({
  page,
}) => {
  await page.goto('./#/pokemon/6');
  const variety = page.getByLabel('Pokémon variety', { exact: true });
  await expect(variety).toBeEnabled();
  await variety.selectOption({ label: 'Charizard Mega X' });
  await expect(
    page.getByRole('heading', { name: 'Charizard Mega X', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.pokemon-summary .badge-row')).toContainText(
    'dragon',
  );
  await page.getByRole('checkbox', { name: 'Shiny artwork' }).check();
  await expect(page).toHaveURL(/shiny=1/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Charizard Mega X', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Shiny artwork' }),
  ).toBeChecked();
  await page.route('**/shiny/*.png', (route) => route.abort());
  await page.reload();
  await expect(
    page.getByRole('img', {
      name: 'Charizard Mega X (regular artwork fallback)',
      exact: true,
    }),
  ).toBeVisible();
});
test('random discovery and type quiz work without artwork and count only one answer', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.route('**/*.png', (route) => route.abort());
  await page.goto('./#/discover');
  await page
    .getByRole('button', { name: 'Discover a random Pokémon', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Bulbasaur', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Type quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Start quiz', exact: true }).click();
  await expect(page.locator('.quiz-options button')).toHaveCount(4);
  await page.getByRole('button', { name: 'Bulbasaur', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText(/Correct! The answer is Bulbasaur/),
  ).toBeVisible();
  await expect(page.getByText(/Streak: 1 · Best streak: 1/)).toBeVisible();
  for (const button of await page.locator('.quiz-options button').all())
    await expect(button).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Type quiz', exact: true }).click();
  await expect(page.getByText(/Best streak: 1/)).toBeVisible();
});
