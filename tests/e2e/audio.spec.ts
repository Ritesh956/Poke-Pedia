import { test, expect } from '@playwright/test';
test('cry loads only on explicit play, works after waiting, and stops previous playback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    class FakeAudio {
      static created = 0;
      currentTime = 0;
      volume = 1;
      onplaying: (() => void) | null = null;
      onended: (() => void) | null = null;
      onpause: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        FakeAudio.created++;
        document.documentElement.dataset.audioCount = String(FakeAudio.created);
      }
      play() {
        this.onplaying?.();
        return Promise.resolve();
      }
      pause() {
        this.onpause?.();
      }
      load() {}
      removeAttribute() {}
    }
    window.Audio = FakeAudio as unknown as typeof Audio;
  });
  await page.goto('./#/compare?first=25&second=133');
  await expect(
    page.getByRole('button', { name: 'Play cry', exact: true }),
  ).toHaveCount(2);
  await page.waitForTimeout(3500);
  expect(
    await page.locator('html').getAttribute('data-audio-count'),
  ).toBeNull();
  await page
    .getByRole('button', { name: 'Play cry', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Stop cry', exact: true }),
  ).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-audio-count', '1');
  await page.getByRole('button', { name: 'Play cry', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Stop cry', exact: true }),
  ).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-audio-count', '2');
  await page.getByRole('button', { name: 'Stop cry', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Play cry', exact: true }),
  ).toHaveCount(2);
});
