# PokemonPedia

A fan-made Pokédex with searchable types and categories, full details, base stat comparison, and branching evolution families. Uses React, TypeScript, Vite, and TanStack Query. No database, account, or paid service is needed.

For the next development session, start with [the handoff](docs/next-session.md), [implementation progress](docs/implementation-progress.md), and `AGENTS.md`. The handoff records completed scope, validation evidence, saved data versions, and the remaining priorities.

Mark Pokémon as Favorite or Caught from their cards or details, then use the catalogue collection filters to view your choices. They are saved in this browser on this device. Expand Collection backup to export a JSON file or import one. Import adds to existing choices by default; the explicitly selected Replace mode overwrites both lists. Invalid imports preserve existing choices. When storage is blocked or full, the app keeps session choices and explains that they need exporting to survive a reload.

The CSS build uses Tailwind 4 through its Vite integration and retains the existing theme configuration. Browser requirements follow [Tailwind's upgrade guide](https://tailwindcss.com/docs/upgrade-guide): Safari 16.4+, Chrome 111+, and Firefox 128+.

## Varieties shiny artwork and discovery

Pokémon details provide a variety selector and a shiny-artwork switch. The saved varieties include regional and other alternate Pokémon listed in PokéAPI's species `varieties` resource. Changing varieties updates matching stats, types, abilities, artwork, and cries while retaining species identity for collections and family navigation. Selection and shiny preference are in the URL. Missing or broken shiny artwork falls back to regular artwork; missing media preserves the layout. Cosmetic-only forms outside those species varieties are outside this initial scope. Comparison and teams still select default varieties.

```sh
npm run data:forms
npm run data:forms -- --refresh
```

Generate the catalogue before varieties. Varieties are cached and published in their own immutable version directory; the manifest is replaced only after all species validate. The saved set has 1,351 varieties across 1,025 species. Concurrent refreshes share the same lock. Raw responses are reused on retries. Atomic directory publication retries temporary Windows file-lock errors.

Discover offers a random Pokémon and an accessible type quiz. Each question has four distinct species and exactly one matching set of types. No image is required to answer. Answer feedback, keyboard navigation, a current streak, and a local best streak are included; the current streak resets on reload. Failed score storage leaves the quiz usable for the session.

## Offline use

Offline caching runs in production builds on HTTPS or localhost. Use `npm run build` and `npm run preview` to test it. A successful first online visit saves the shell, route scripts, styles, catalogue, type chart, and manifests. Visited family/variety files are cached up to 40 entries per build version. Eligible CORS-readable artwork is limited to 32 images of at most 1 MB each; opaque or inaccessible media may require internet. Cries are not cached.

New service workers prepare their cache before activation and wait for the user to select Reload to update. The preceding cache version is retained so existing pages can continue loading their assets; older versions are removed. A failed installation leaves the current worker available. Offline status explains that uncached varieties, families, artwork, and cries can remain unavailable. Core data stays on the installed snapshot until the explicit update reload. Clearing browser site data removes offline files and local collections/scores.

The application manifest supports standalone display where the browser allows it; installation prompts and physical-device behavior are not guaranteed. [MDN's service worker guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) explains the installation and update lifecycle.

## Performance checks

```sh
# Build first, then collect a fresh lab baseline:
npm run build
npm run benchmark
# Enforce deterministic transfer/card/offline-download guardrails:
npm run benchmark:check
# Evaluate a compact index without changing published data or app loading:
npm run benchmark:index
# Build and measure the lossless optional catalogue transport in the real app:
npm run build:compact
npm run test:e2e:compact
npm run benchmark:catalogue
# Verify real representation updates and paced page/worker installation:
npm run validate:offline-transports
```

The benchmark starts and closes its own production preview. It takes three cold browser-context samples and three warm document reloads at 390 by 844 pixels, 150 ms latency, 1.6 Mbps download, 750 kbps upload, and 4x CPU slowdown. Normal HTTP caching remains enabled. Artwork and cry hosts are blocked, and service workers are blocked for the core timing samples. A separate unthrottled installation probe counts actual preview-server catalogue requests as well as browser fetch operations. Warm fetches and worker fetches may be fulfilled by HTTP cache without reaching the server.

`docs/performance-baseline.json` retains every sample and its median. This is a lab diagnostic; it is not a Lighthouse score, INP measurement, physical-phone benchmark or complete artwork-inclusive load test. Search timing includes the existing 300 ms debounce. CI checks cold same-origin transfer up to 280 KiB, no more than 40 initially mounted cards, and at most one actual catalogue HTTP request during offline installation. Timing values are recorded rather than hard-gated because host load varies.

Offline preparation starts after catalogue data has loaded and a frame has painted. Immutable catalogue and hashed asset URLs can reuse HTTP cache; shell and manifest requests still refresh. The controlled cache-policy reports use the same application and deferred installer, changing only the worker cache policy to compare two server catalogue requests under forced reload with one under the current policy. See the performance report for results and remaining work.

The historical [compact-index evaluation](docs/catalogue-evaluation.md) records a 40.8% gzip catalogue payload saving in an isolated data-path harness, added detail latency and unavailable unvisited details offline. That split candidate remains deferred; its timings are not full-application benchmarks.

The subsequent [lossless application evaluation](docs/compact-application-evaluation.md) preserves every default-variety field and full catalogue offline coverage in an opt-in `build:compact` production build. It reduces measured cold application transfer by 10.1% in the matched lab run, with similar cold timing medians. Standard builds remain the default. `benchmark:catalogue` builds both variants in ignored temporary directories and saves their complete reports together; it does not replace the historical baseline or `dist/public`. Compact mode is generated during production builds; development and the optional API retain standard data. Return a local compact preview to standard with `npm run build`.

[Worker migration and installation checks](docs/transport-offline-validation.md) now verify actual standard-to-compact and compact-to-standard updates, favorite preservation, failed-install recovery and complete default offline workflows. Six installations also pass behind a proxy that paces both page and worker response bodies at 1.6 Mbps with 150 ms added latency. This is a local lab profile with CPU/upload unshaped and media blocked. The command builds in ignored directories and retains request-level evidence; it does not change `dist/public` or publish a site.

## Updating the improvement plans

Every implementation batch updates `docs/update-log.json` after each step and records validation and limitations. The Word and PDF plan retain the original audit and append the cumulative history, including the earlier core, collection, and team updates. `AGENTS.md` makes this requirement explicit for future updates. `scripts/update-plan.py` refreshes the Word appendix; `scripts/render-plan.ps1` uses installed Microsoft Word and Poppler to export and render the matching PDF. These artifact helpers use the bundled Codex runtime paths on this workstation. Inspect rendered pages before delivering document updates.

## Language and game references

Details include English, Japanese, French and Spanish species names and descriptions, plus a selected game group. Language, group, variety and shiny selection are preserved in the URL. A description in the requested language and game is preferred; English text for the selected game is the next fallback. If that game has no saved text, another version is used and clearly identified. Interface labels and form, move and location identifiers remain English.

Move-learning records and encounter locations are specific to the selected variety and game group. Levels, methods, encounter versions and conditions come from the saved upstream records. The move table starts with 40 records and supports search and Load more. Evolution links retain the game context and filter source-tagged conditions; missing game-specific rules explicitly show the full source alternatives. Empty reference records do not prove game availability, and current base stats/types are not recalculated for historical games.

```sh
npm run data:reference
npm run data:reference -- --refresh
```

The generator discovers game groups, reuses the raw-response cache and shared refresh lock, validates species/variety identity, and atomically publishes the reference directory and manifest. The saved set covers 1,025 species and 32 game groups and is about 35 MB on disk. Files are requested per species rather than transferred with the catalogue. A visited reference can work offline within the existing 40-entry data cache; its manifest is included in the core cache. Source models are described in [PokéAPI documentation](https://pokeapi.co/docs/v2/).

## Team builder

Open Team in the navigation or Start a team from a Pokémon's details. Six ordered slots support name/number search, empty slots, and duplicate species. Your lineup is stored in the URL rather than local storage; bookmark or copy the team link to keep it. Export/import uses a separate `pokemonpedia-team.json` file. Import restores all six slots and invalid files preserve the current lineup. Selections outside the current snapshot remain in the URL and export, but are clearly excluded from coverage calculations.

The defensive coverage table combines both Pokémon types and counts weak, resistant, and immune slots for every attacking type. It uses the standard Generation VI onward type chart, excluding abilities, items, moves, and Terastallization; it does not predict battle outcomes. Its saved data comes from [PokéAPI type damage relationships](https://pokeapi.co/docs/v2/#types). No upstream type requests are made during a visit.

```sh
npm run data:types
# Explicit upstream type refresh:
npm run data:types -- --refresh
```

Type refresh reuses the same raw-response cache, request timeout/retry policy, and refresh lock as the catalogue generator. All 18 types and 324 relationships must validate before the saved chart is replaced. Failed refreshes preserve the published chart. Catalogue and type chart refreshes are separate commands.

## Run locally

Use Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. A validated snapshot is committed under `client/public/data`, so opening the app makes no live PokéAPI requests. Artwork and cry playback still require access to their upstream media hosts.

```sh
npm run check
npm run lint
npm run format:check
npm test
npx playwright install chromium firefox webkit
npm run test:e2e
npm run test:e2e:compact
npm run report:browser-engines
npm run build
npm run preview
```

Browser tests run 22 scenarios in each of Chromium, Firefox and WebKit, for both standard and compact production builds. They exercise search, delayed navigation, keyboard details/selectors, comparison, evolution races, retries, missing images, collections, teams, forms, references, quiz and offline behavior, with layouts at 320, 390, 768, 1024 and 1440 pixels. An origin-level socket-outage fixture verifies offline data even when browser emulation leaves worker traffic online; the suite stays serial with one worker. Both commands build and preview under `/PokemonPedia/`. `report:browser-engines` publishes a summary only after all six profiles pass without skips or flaky outcomes. See [browser-engine validation](docs/browser-engine-validation.md) for evidence and limits. CI runs these checks without refreshing upstream data. `npm run format` formats application and supporting source; template UI primitives are excluded from formatting and linting.

## Data snapshots

```sh
npm run data:sync
# Explicitly request updated upstream resources instead of reusing local cache:
npm run data:sync -- --refresh
```

The generator discovers the species index rather than relying on a fixed maximum ID. It fetches each species and its default variety, normalizes fractional measurements, retains hidden abilities and six base stats, and writes species-keyed evolution trees with condition alternatives. [PokéAPI documentation](https://pokeapi.co/docs/v2/) describes these resources and asks consumers to cache requests.

Raw responses are cached in ignored `.cache/pokeapi`. Up to six workers run with 15-second request timeouts and three attempts with backoff for transient failures. A lock prevents overlapping refreshes. A failed refresh retains cached successes for the next attempt and leaves the published manifest untouched. If a process is killed, remove `.cache/pokeapi/sync.lock` only after verifying no refresh is still running.

All records and families must validate before publication. Files are written into a content-versioned directory and `manifest.json` is atomically replaced last. Keep the preceding version directory for rollback: restore its old manifest from Git and rebuild. Avoid deleting old version directories while clients may still be using them.

`--limit=40` supports a deliberately partial development snapshot. The manifest records missing species and the UI displays partial coverage. Do not commit a limited snapshot for a full release. For routine development, retain the committed complete snapshot.

This implementation uses one approximately 950 kB uncompressed catalogue JSON for the complete default-variety dataset, plus separately requested family files. This keeps comparison and filtering available across every species with two initial static requests. Only 40 cards mount initially. Individual detail files can be introduced later if measured transfer costs justify the extra complexity. Regional and alternate varieties are stored separately for the details browser; catalogue and team counts still represent default varieties.

## Static deployment

`npm run build` writes only the client and saved data to `dist/public`. Deploy that directory to a static host. This repository is `Ritesh956/Poke-Pedia`; its repository-site base path would be `/Poke-Pedia/`. The browser test fixture uses `/PokemonPedia/` to exercise a non-root path. Set the base to match the chosen hosting destination. For this repository site in PowerShell:

```powershell
$env:VITE_BASE_PATH = '/Poke-Pedia/'
npm run build
```

For a root-domain site, use `/`. Hash routes such as `/Poke-Pedia/#/pokemon/25` work on refresh without an Express server or host rewrite rules. Search, filters, layout, sort, comparison selections, and evolution selection live in the route URL. The repository has validation CI; it does not publish automatically. Confirm public repository/data visibility before enabling deployment. No deployment was performed during implementation.

## Optional Express wrapper

```sh
npm run dev:server
npm run build:server
npm start
```

`PORT` defaults to 5000 and `HOST` to `127.0.0.1`. See `.env.example`; variables must be set in the environment (no automatic dotenv loader). The wrapper reads the same validated snapshot once at startup, exposes `/health` and `/api/ready`, and retains catalogue and family API endpoints for local experiments. It never imports upstream data during a visitor request. Missing or invalid snapshots stop startup with an actionable error. API pagination and chain IDs are validated; logging records duration and status rather than payloads. For static deployment, neither this server nor its APIs are required.

## Plan progress

See [implementation progress](docs/implementation-progress.md) and the cumulative history in both plan files for acceptance evidence and remaining work. Favorites, caught tracking, teams, shiny/variety browsing, offline support, and discovery/quiz are implemented. Localized species names/descriptions and game-specific references are implemented within a focused scope. Broader interface translation and release checks remain.

Pokémon and related properties belong to Nintendo, Game Freak, and The Pokémon Company. PokéAPI is the data source; this app is not an official Pokémon product.
