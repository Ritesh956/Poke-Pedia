import { readFile, writeFile } from 'node:fs/promises';
interface Sample {
  state: 'cold' | 'warm';
  firstResultsMs: number;
  searchMs: number;
  mountedCards: number;
}
interface Report {
  generatedAt: string;
  browserVersion: string;
  runtime: { node: string; platform: string; architecture: string };
  summary: Record<
    'cold' | 'warm',
    { firstResultsMs: number; searchMs: number; transferredBytes: number }
  >;
  runs: Sample[];
  budgetChecks: Record<string, boolean>;
  offlineInstallProbe: { catalogueHttpRequests: number };
}
const baseline: Report = JSON.parse(
  await readFile('docs/performance-baseline.json', 'utf8'),
);
const legacy = JSON.parse(
  await readFile('docs/performance-cache-legacy.json', 'utf8'),
);
const current = JSON.parse(
  await readFile('docs/performance-cache-current.json', 'utf8'),
);
const seconds = (milliseconds: number) => (milliseconds / 1000).toFixed(2);
const recordedDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Calcutta',
  dateStyle: 'long',
}).format(new Date(baseline.generatedAt));
const range = (state: Sample['state']) => {
  const values = baseline.runs
    .filter((run) => run.state === state)
    .map((run) => run.firstResultsMs);
  return `${seconds(Math.min(...values))}–${seconds(Math.max(...values))} s`;
};
const report = `# PokemonPedia performance baseline

Recorded on ${recordedDate} from the production build using Chromium ${baseline.browserVersion}, Node ${baseline.runtime.node}, and ${baseline.runtime.platform}/${baseline.runtime.architecture}. Results describe this lab run and host; they do not establish performance on a physical phone or a public deployment.

## Core loading results

Three fresh browser contexts were each followed by a warm document reload. The profile was 390 × 844 pixels, 150 ms latency, 1.6 Mbps download, 750 kbps upload, and 4× CPU slowdown. Vite preview supplied gzip compression, and normal HTTP caching stayed enabled. Known artwork/cry hosts and service workers were blocked for these timing samples so application/data delivery could be measured consistently.

| Metric | Cold median | Warm median |
| --- | ---: | ---: |
| First catalogue results | ${seconds(baseline.summary.cold.firstResultsMs)} s | ${seconds(baseline.summary.warm.firstResultsMs)} s |
| First-results sample range | ${range('cold')} | ${range('warm')} |
| Name/number search response | ${seconds(baseline.summary.cold.searchMs)} s | ${seconds(baseline.summary.warm.searchMs)} s |
| Same-origin transfer including navigation | ${(baseline.summary.cold.transferredBytes / 1024).toFixed(1)} KiB | ${(baseline.summary.warm.transferredBytes / 1024).toFixed(1)} KiB |
| Initially mounted cards | 40 | 40 |

Search response includes the deliberate 300 ms debounce and automation observation overhead. Transfer values come from browser Resource Timing, rather than a packet capture. First-results time includes navigation, loading, parsing, rendering and polling. These are not Lighthouse scores, INP or artwork-inclusive Web Vitals. Host load and browser startup affect timings; all individual samples are retained in performance-baseline.json.

## Offline preparation improvement

Registration now waits until catalogue data is available and a frame has painted. Versioned catalogue URLs and current hashed build assets can reuse the browser HTTP cache; shell and manifest requests still refresh. This preserves the existing explicit update flow and atomic snapshot behavior.

A separate unthrottled controlled installation comparison used the same updated application and deferred installer, changing only the worker's immutable-file cache policy. The reload-policy fixture produced **${legacy.offlineInstallProbe.catalogueHttpRequests} catalogue HTTP requests**, while the current policy produced **${current.offlineInstallProbe.catalogueHttpRequests}**. Browser fetch operations still number two because one can be served from HTTP cache. This comparison establishes the duplicate-download fix; it is not a before/after claim about overall startup speed.

## Repeatable guardrails

CI runs npm run benchmark:check after the browser suite. It enforces cold same-origin transfer at or below 280 KiB, at most 40 initial cards, and at most one catalogue HTTP request during offline installation. Current checks: ${Object.entries(
  baseline.budgetChecks,
)
  .map(([name, passed]) => `${name}: ${passed ? 'pass' : 'fail'}`)
  .join(', ')}. Timing values remain informational because machine load varies.

Use npm run build followed by npm run benchmark to regenerate the baseline. The script launches and closes its own preview server. The three JSON reports preserve the measured baseline and cache-policy controls.

## Remaining work

Cold loading is still several seconds on this constrained profile. A measured evaluation of a smaller catalogue index with detail files is a useful follow-up; its transfer savings must be weighed against extra requests and loss of instant full-dataset comparison. Verify compression and cache behavior on the eventual host or optional Express wrapper; these measurements apply to Vite preview. Artwork-inclusive loading, worker installation under global network shaping, other engines, physical devices and field Web Vitals remain separate checks. No public hosting change or deployment was made.
`;
await writeFile('docs/performance-report.md', report);
console.log('Updated docs/performance-report.md');
