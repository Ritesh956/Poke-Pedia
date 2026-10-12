import { chromium, firefox, webkit } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

interface Run {
  projectName: string;
  expectedStatus: string;
  annotations: { type: string; description?: string }[];
  results: { status: string; duration: number }[];
}
interface Suite {
  title: string;
  specs?: { title: string; tests: Run[] }[];
  suites?: Suite[];
}
interface Report {
  suites: Suite[];
  stats: {
    expected: number;
    unexpected: number;
    skipped: number;
    flaky: number;
    startTime: string;
    duration: number;
  };
}
const summary: Record<string, unknown> = {};
for (const mode of ['standard', 'compact']) {
  const report: Report = JSON.parse(
    await readFile(`tmp/review/browser-engines/${mode}.json`, 'utf8'),
  );
  assert.equal(report.stats.unexpected, 0, `${mode} has unexpected failures`);
  assert.equal(report.stats.flaky, 0, `${mode} has flaky results`);
  assert.equal(report.stats.skipped, 0, `${mode} has skipped scenarios`);
  const rows: {
    file: string;
    scenario: string;
    engine: string;
    status: string;
    durationMs: number;
    annotations: Run['annotations'];
  }[] = [];
  function collect(suite: Suite, file: string) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests) {
        const result = test.results.at(-1);
        assert.equal(test.expectedStatus, 'passed');
        assert.equal(
          result?.status,
          'passed',
          `${mode}/${test.projectName}: ${spec.title}`,
        );
        rows.push({
          file,
          scenario: spec.title,
          engine: test.projectName,
          status: result.status,
          durationMs: result.duration,
          annotations: test.annotations,
        });
      }
    for (const child of suite.suites ?? []) collect(child, file);
  }
  for (const suite of report.suites) collect(suite, suite.title);
  const engines = Object.fromEntries(
    ['chromium', 'firefox', 'webkit'].map((engine) => {
      const tests = rows.filter((row) => row.engine === engine);
      assert.equal(
        tests.length,
        22,
        `${mode}/${engine} scenario coverage changed`,
      );
      assert.equal(
        tests.filter((row) =>
          row.annotations.some(
            (annotation) => annotation.type === 'offline-fixture',
          ),
        ).length,
        2,
      );
      return [engine, { passed: tests.length, skipped: 0, failed: 0 }];
    }),
  );
  assert.equal(rows.length, report.stats.expected);
  summary[mode] = {
    startTime: report.stats.startTime,
    durationMs: report.stats.duration,
    engines,
    scenarios: rows,
  };
}
const versions: Record<string, string> = {};
for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  try {
    versions[name] = browser.version();
  } finally {
    await browser.close();
  }
}
await writeFile(
  'docs/browser-engine-validation.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      runtime: {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
      versions,
      methodology:
        'The complete 22-scenario Playwright application suite runs serially once per Chromium, Firefox and WebKit project in each standard and compact production build under /PokemonPedia/. Every scenario must pass with no skips, flaky retries or expected failures before this summary publishes. Offline-data scenarios combine browser offline mode with a test-only preview middleware that closes origin sockets; an independent Node fetch must reject. This prevents worker-side network access from bypassing browser offline emulation. The same-origin outage fixture relies on the configured single worker and always removes its marker. Tests include emulated touch, keyboard, large text, fallback media, collections/backups, forms, references, quiz, comparison, teams, invalid data/retries, offline eviction and explicit updates. Audio behavior uses a deterministic audio double. Durations are functional test timings, not decoding benchmarks or field performance. WebKit on Windows is a Playwright engine, not a certification of Safari or physical Apple devices.',
      fixes: [
        'Each page owns its URL parameter updates, preventing delayed search or import callbacks from modifying a different destination route.',
        'Added a slow detail-chunk navigation regression and reliable origin-level outage fixtures for offline data tests.',
        'Declared the incumbent dark native-control scheme so WebKit selectors remain readable without changing the application layout.',
      ],
      limits:
        'Physical touch devices, screen readers, live audio decoding, complete-media performance, browser-minimum-version coverage, independent decode profiling, field metrics and public-host deployment remain pending.',
      modes: summary,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Saved 132 passing browser-scenario executions across both builds and three engines.',
);
