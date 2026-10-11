import type { Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
export function offlinePlugin(): Plugin {
  return {
    name: 'pokemonpedia-offline',
    apply: 'build',
    async generateBundle(_options, bundle) {
      const publicRoot = path.resolve('client/public');
      const manifest = JSON.parse(
        await readFile(path.join(publicRoot, 'data/manifest.json'), 'utf8'),
      );
      const source = await readFile('client/service-worker.js', 'utf8');
      const files = [
        '.',
        ...Object.keys(bundle),
        'favicon.svg',
        'manifest.webmanifest',
        'data/manifest.json',
        `data/${manifest.version}/catalogue.json`,
        'data/forms/manifest.json',
        'data/type-chart.json',
        'data/reference/manifest.json',
      ];
      const staticData = await Promise.all(
        files
          .filter((file) => file.startsWith('data/'))
          .map((file) => readFile(path.join(publicRoot, file))),
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
