import { build } from 'vite';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { manifestSchema } from '../shared/schema';
import { compactCatalogueFilename } from '../shared/compact-catalogue';

interface BenchmarkReport {
  catalogueTransport: string;
  summary: Record<
    'cold' | 'warm',
    { firstResultsMs: number; searchMs: number; transferredBytes: number }
  >;
  budgetChecks: Record<string, boolean>;
  [key: string]: unknown;
}
const output = 'docs/compact-application-evaluation.json';
const manifest = manifestSchema.parse(
  JSON.parse(await readFile('client/public/data/manifest.json', 'utf8')),
);
const originalCompact = process.env.VITE_COMPACT_CATALOGUE;
const originalBase = process.env.VITE_BASE_PATH;
const reports: Record<string, BenchmarkReport> = {};
const payloads: Record<string, { rawBytes: number; gzipBytes: number }> = {};
const scratchRoot = path.resolve('tmp/review/catalogue-build-comparison');
await mkdir(scratchRoot, { recursive: true });
try {
  process.env.VITE_BASE_PATH = '/PokemonPedia/';
  for (const compact of [false, true]) {
    const mode = compact ? 'compact' : 'standard';
    process.env.VITE_COMPACT_CATALOGUE = compact ? '1' : '0';
    const distRoot = path.join(scratchRoot, mode);
    await build({ build: { outDir: distRoot, emptyOutDir: true } });
    const reportFile = path.join(scratchRoot, `${mode}.json`);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/benchmark.ts',
          `--dist=${distRoot}`,
          `--output=${reportFile}`,
          '--check',
        ],
        { stdio: 'inherit' },
      );
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Benchmark ${mode} exited ${code}`)),
      );
    });
    const report: BenchmarkReport = JSON.parse(
      await readFile(reportFile, 'utf8'),
    );
    assert.equal(
      report.catalogueTransport,
      compact ? 'compact-v1' : 'standard',
    );
    assert.ok(Object.values(report.budgetChecks).every(Boolean));
    reports[mode] = report;
    const payload = await readFile(
      path.join(
        distRoot,
        'data',
        manifest.version,
        compact ? compactCatalogueFilename : 'catalogue.json',
      ),
    );
    payloads[mode] = {
      rawBytes: payload.length,
      gzipBytes: gzipSync(payload).length,
    };
  }
  await writeFile(
    output,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        snapshot: manifest.version,
        methodology:
          'Same current application built twice into ignored isolated directories under /PokemonPedia/, standard first then lossless compact. Each build uses the existing benchmark with three cold contexts, three warm reloads and an unthrottled worker installation probe. Both must pass transfer, mounted-card and catalogue-HTTP-request budgets. All normalized default-variety fields remain available in compact mode. Timings are sequential lab samples with media blocked, not randomized causal estimates, full-media loads, field Web Vitals or physical-device results. Standard production configuration and published source data remain unchanged.',
        payloads,
        differences: {
          gzipCatalogueBytesSaved:
            payloads.standard.gzipBytes - payloads.compact.gzipBytes,
          coldApplicationBytesSaved:
            reports.standard.summary.cold.transferredBytes -
            reports.compact.summary.cold.transferredBytes,
          coldResultsMsDifference:
            reports.compact.summary.cold.firstResultsMs -
            reports.standard.summary.cold.firstResultsMs,
          warmResultsMsDifference:
            reports.compact.summary.warm.firstResultsMs -
            reports.standard.summary.warm.firstResultsMs,
        },
        reports,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Saved matched application evaluation to ${output}`);
} finally {
  if (originalCompact === undefined) delete process.env.VITE_COMPACT_CATALOGUE;
  else process.env.VITE_COMPACT_CATALOGUE = originalCompact;
  if (originalBase === undefined) delete process.env.VITE_BASE_PATH;
  else process.env.VITE_BASE_PATH = originalBase;
}
