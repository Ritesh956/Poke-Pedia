import type { Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { catalogueSchema } from '../shared/schema';
import {
  compactCatalogueFilename,
  encodeCompactCatalogue,
  decodeCompactCatalogue,
} from '../shared/compact-catalogue';
import assert from 'node:assert/strict';
export function offlinePlugin(compact = false): Plugin {
  return {
    name: 'pokemonpedia-offline',
    apply: 'build',
    async generateBundle(_options, bundle) {
      const publicRoot = path.resolve('client/public');
      const manifest = JSON.parse(
        await readFile(path.join(publicRoot, 'data/manifest.json'), 'utf8'),
      );
      const source = await readFile('client/service-worker.js', 'utf8');
      const catalogueFile = `data/${manifest.version}/${compact ? compactCatalogueFilename : 'catalogue.json'}`;
      let compactSource: string | undefined;
      if (compact) {
        const records = catalogueSchema.parse(
          JSON.parse(
            await readFile(
              path.join(publicRoot, `data/${manifest.version}/catalogue.json`),
              'utf8',
            ),
          ),
        );
        const wire = encodeCompactCatalogue(records);
        assert.deepEqual(decodeCompactCatalogue(wire), records);
        compactSource = JSON.stringify(wire) + '\n';
        this.emitFile({
          type: 'asset',
          fileName: catalogueFile,
          source: compactSource,
        });
      }
      const files = [
        '.',
        ...Object.keys(bundle).filter((file) => file !== catalogueFile),
        'favicon.svg',
        'manifest.webmanifest',
        'data/manifest.json',
        catalogueFile,
        'data/forms/manifest.json',
        'data/type-chart.json',
        'data/reference/manifest.json',
      ];
      const staticData = await Promise.all(
        files
          .filter((file) => file.startsWith('data/'))
          .map((file) =>
            compactSource && file === catalogueFile
              ? Promise.resolve(Buffer.from(compactSource))
              : readFile(path.join(publicRoot, file)),
          ),
      );
      const shell = await readFile('client/index.html', 'utf8'),
        webmanifest = await readFile(
          path.join(publicRoot, 'manifest.webmanifest'),
          'utf8',
        );
      const version = createHash('sha256')
        .update(
          source +
            shell +
            webmanifest +
            JSON.stringify(bundle) +
            staticData.map((data) => data.toString()).join(''),
        )
        .digest('hex')
        .slice(0, 16);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const VERSION=${JSON.stringify(version)}; const PRECACHE=${JSON.stringify(files)};\n${source}`,
      });
    },
  };
}
