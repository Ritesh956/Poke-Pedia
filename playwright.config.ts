import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { rmSync, mkdirSync } from 'node:fs';
const networkMarker = path.resolve('tmp/review/e2e-origin-offline');
mkdirSync(path.dirname(networkMarker), { recursive: true });
rmSync(networkMarker, { force: true });
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  projects: (['chromium', 'firefox', 'webkit'] as const).map((browserName) => ({
    name: browserName,
    use: { browserName },
  })),
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          process.env.POKEMONPEDIA_E2E_REPORT ??
          `tmp/review/browser-engines/${process.env.VITE_COMPACT_CATALOGUE === '1' ? 'compact' : 'standard'}.json`,
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173/PokemonPedia/',
    headless: true,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    env: {
      VITE_BASE_PATH: '/PokemonPedia/',
      POKEMONPEDIA_E2E_NETWORK_GATE: networkMarker,
    },
    timeout: 120000,
    url: 'http://127.0.0.1:4173/PokemonPedia/',
    reuseExistingServer: false,
  },
});
