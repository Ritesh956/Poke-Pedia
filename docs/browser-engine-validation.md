# Browser engine validation

Recorded on 12 October 2026. All 132 application-scenario executions pass across Chromium, Firefox and WebKit in standard and compact production builds, with no skips or flaky outcomes. This batch adds reliable origin-level offline fixtures and fixes a delayed URL update and native-control contrast found during the rollout. The existing application layout, saved data and standard catalogue default are preserved.

| Engine   | Tested version |  Standard |   Compact |
| -------- | -------------- | --------: | --------: |
| Chromium | 156.0.8078.4   | 22 passed | 22 passed |
| Firefox  | 157.0          | 22 passed | 22 passed |
| WebKit   | 27.2           | 22 passed | 22 passed |

Type checking, lint, formatting, all 30 unit/API tests, both production builds and deterministic performance budgets pass. The latest standard/compact budget runs transfer 266,055 and 239,127 cold same-origin bytes, mount 40 initial cards and download the catalogue once during offline preparation. These fresh budget reports stay in ignored temporary output and do not replace the historical performance baseline. The standard local build was restored after the final compact run.

## Reproduce and evidence

```sh
npx playwright install chromium firefox webkit
npm run test:e2e
npm run test:e2e:compact
npm run report:browser-engines
```

Each application command builds its own production preview under `/PokemonPedia/`, runs all three engine projects serially, and saves raw JSON under ignored `tmp/review/browser-engines/standard.json` or `compact.json`. Tests require port 4173 to be free. CI installs all engines with their system dependencies and runs both modes. `report:browser-engines` rejects failed, skipped or flaky scenarios and incomplete coverage before writing the [retained summary](browser-engine-validation.json). The summary records versions, environment, case names, durations and offline-fixture annotations; it requires 22 passing cases per engine and two verified origin-outage scenarios in each profile.

The ordinary `test:e2e` command now runs three engines rather than Chromium alone. Use `node node_modules/@playwright/test/cli.js test --project=chromium` for a focused local run. Focused runs do not satisfy the complete report's coverage requirement. `POKEMONPEDIA_E2E_REPORT` can direct diagnostic JSON elsewhere so it does not overwrite the final matrix. Per-mode, per-engine screenshot names also prevent compact or later projects from replacing standard captures.

## Findings and fixes

### Delayed search navigation

WebKit exposed a catalogue search callback adding `q` to a detail URL after navigation. A lazy destination can take time to replace the previous React page, so effect cleanup alone did not make URL ownership reliable. Every page now identifies its owning route when updating URL parameters. A delayed catalogue callback is ignored once the hash points to a detail page; same-route filters, variety/game/language choices and team links continue to merge normally.

Three unit tests cover stale search/import callbacks, detail identity, same-route merges, deletions and Unicode encoding. A browser regression delays the detail script, starts a catalogue search, opens a detail card and verifies that the destination URL remains free of stale catalogue parameters. The cumulative unit/API suite has 30 tests.

### Genuine offline origin outage

The first Firefox run could load unvisited variety data despite browser offline emulation. The tests now combine that emulation with a test-only preview middleware that closes origin sockets. An independent Node fetch must reject before the offline assertions proceed. This validates cached reload, comparison, teams and unvisited default summaries while uncached varieties correctly report unavailability.

The outage marker lives under ignored `tmp/review`, is cleared before the suite, and is always removed by fixture teardown. It applies to the shared preview origin, so tests retain the existing single worker and serial execution. The middleware activates only when the test-specific environment variable is provided; normal previews, client builds and public application behavior do not include the outage control.

### Native control theme

Visual review found WebKit painting the native sort field with a light surface while using the application's light text. The root now declares the existing dark color scheme so native selectors and checkboxes use a readable matching browser surface. The controls, typography, spacing and application layout remain in place. A batched mobile catalogue/desktop detail review covered all three engines; the Impeccable mechanical detector returned no findings. Detector output is not accessibility certification.

## Coverage and limits

The 22 cases cover delayed navigation, search/filter/sort/layout, keyboard details/selectors, collections and backups, forms and shiny fallback, game/language references, quiz, comparison, teams, retries, invalid transport, responsive layout and 200-percent text, offline reload, real cache eviction and explicit worker updates. The final matrix and current counts are recorded in the summary and [verification](verification.json).

These are current desktop Playwright engines on Windows with emulated viewports, touch input and keyboard actions. WebKit is not a certification of branded Safari or Apple devices, and minimum browser versions were not exercised. Cry-controller behavior uses a deterministic audio double. Test durations are not isolated decoding measurements or field performance. Screen readers, physical touch devices, actual cry decoding/audibility, full-media/field performance and public-host compression/cache/rollback remain release checks. No upstream refresh, public deployment or account change was performed.
