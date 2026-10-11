import { test, expect } from '@playwright/test';
test('builds six slots by keyboard, allows duplicates, shares, reloads, and exports', async ({
  page,
}) => {
  await page.goto('./#/team');
  await expect(
    page.getByRole('heading', { name: 'Build a Pokémon team' }),
  ).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveCount(6);
  const slot = page.getByRole('region', { name: 'Team slot 1', exact: true });
  await slot.getByRole('searchbox').fill('6');
  await slot.getByRole('combobox').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('1 of 6 slots selected', { exact: true }),
  ).toBeVisible();
  const second = page.getByRole('region', { name: 'Team slot 2', exact: true });
  await second.getByRole('searchbox').fill('6');
  await second.getByRole('combobox').click();
  await page.getByRole('option', { name: /Charizard/ }).click();
  await expect(
    page.getByText('2 of 6 slots selected', { exact: true }),
  ).toBeVisible();
  const rock = page.getByRole('row').filter({
    has: page.getByRole('rowheader', { name: 'rock', exact: true }),
  });
  await expect(rock.getByRole('cell')).toHaveText(['4×', '4×', '2', '0', '0']);
  const ground = page.getByRole('row').filter({
    has: page.getByRole('rowheader', { name: 'ground', exact: true }),
  });
  await expect(ground.getByRole('cell')).toHaveText([
    '0×',
    '0×',
    '0',
    '0',
    '2',
  ]);
  await expect(page.getByLabel('Shareable team link')).toHaveValue(
    /team=6,6,0,0,0,0$/,
  );
  await page.reload();
  await expect(rock.getByRole('cell')).toHaveText(['4×', '4×', '2', '0', '0']);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export team' }).click();
  expect((await download).suggestedFilename()).toBe('pokemonpedia-team.json');
  await second.getByRole('button', { name: 'Clear selection' }).click();
  await expect(
    page.getByText('1 of 6 slots selected', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear team', exact: true }).click();
  await expect(
    page.getByText('0 of 6 slots selected', { exact: true }),
  ).toBeVisible();
});
test('imports valid teams, preserves them on invalid imports, and excludes unavailable slots', async ({
  page,
}) => {
  await page.goto('./#/team?team=25,0,0,0,0,0');
  const input = page.getByLabel('Team JSON file');
  await input.setInputFiles({
    name: 'team.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      '{"schemaVersion":1,"slots":[6,null,6,99999,null,null]}',
    ),
  });
  await expect(
    page.getByText('Team imported. All six slots were restored.'),
  ).toBeVisible();
  await expect(
    page.getByText('3 of 6 slots selected · 1 unavailable in this snapshot', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Analyzing 2 selected slots; 1 unavailable/),
  ).toBeVisible();
  await input.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('invalid'),
  });
  await expect(page.getByRole('alert')).toContainText(
    'Choose a PokemonPedia team file',
  );
  await expect(
    page.getByText('3 of 6 slots selected · 1 unavailable in this snapshot', {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('./#/team?team=bad');
  await expect(page.getByRole('alert')).toContainText(
    'This team link is invalid',
  );
  await page.getByRole('button', { name: 'Clear team', exact: true }).click();
  await expect(page.getByRole('alert')).not.toBeVisible();
});
test('team coverage failure can be retried without losing selections and layouts fit narrow screens', async ({
  page,
}) => {
  await page.route('**/data/type-chart.json', (route) =>
    route.fulfill({ status: 503, body: '{}' }),
  );
  await page.goto('./#/team?team=6,25,133,1,7,172');
  await expect(page.getByRole('alert')).toContainText(
    'saved type chart could not be loaded',
  );
  await expect(
    page.getByText('6 of 6 slots selected', { exact: true }),
  ).toBeVisible();
  await page.unroute('**/data/type-chart.json');
  await page.getByRole('button', { name: 'Retry type chart' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.screenshot({
    path: 'tmp/review/team-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'tmp/review/team-mobile.png',
    fullPage: false,
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
