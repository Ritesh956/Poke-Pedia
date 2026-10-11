import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173/PokemonPedia/',
    headless: true,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    env: { VITE_BASE_PATH: '/PokemonPedia/' },
    timeout: 120000,
    url: 'http://127.0.0.1:4173/PokemonPedia/',
    reuseExistingServer: false,
  },
});
