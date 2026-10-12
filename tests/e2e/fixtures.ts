import { test as base, expect } from '@playwright/test';
import { writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// One worker is required because the origin outage applies to the preview server.
const marker = path.resolve('tmp/review/e2e-origin-offline');
export const test = base.extend<{ setOriginOffline: () => Promise<void> }>({
  setOriginOffline: async ({ context, baseURL }, use, testInfo) => {
    await rm(marker, { force: true });
    try {
      await use(async () => {
        assert.ok(baseURL);
        await writeFile(marker, 'e2e origin outage\n');
        await context.setOffline(true);
        await assert.rejects(fetch(new URL('data/manifest.json', baseURL)));
        testInfo.annotations.push({
          type: 'offline-fixture',
          description:
            'Origin sockets closed; independent Node fetch rejected; browser offline mode enabled.',
        });
      });
    } finally {
      await rm(marker, { force: true });
    }
  },
});
export { expect };
