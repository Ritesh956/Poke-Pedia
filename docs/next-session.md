# PokemonPedia next session handoff

Updated 12 October 2026. Core plan items R01–R24, roadmap features F01–F06 within their recorded scopes, and the constrained mobile core performance baseline are implemented. The remaining work is performance evaluation, broader translation and release validation. Preserve the existing application design and saved data.

## Start here

Read `AGENTS.md`, [implementation progress](implementation-progress.md), [the update log](update-log.json), [verification](verification.json), and [the performance report](performance-report.md). The Word and PDF plans preserve the original audit and append cumulative implementation evidence. Historical statements that a feature is missing do not describe the current application.

The source branch is `main`, with remote `origin` at `https://github.com/Ritesh956/Poke-Pedia.git`. Check `git status`, `git log -1`, and the upstream comparison before editing. The user authorized committing and pushing this session's work to that remote; a public website deployment still needs a chosen destination and authorization. Validation CI runs on push and pull requests and does not deploy.

## Completed scope

- Saved, validated data replaces visitor-time upstream imports; catalogue, details, comparison and branching evolution use base-aware static paths and hash routes.
- Favorites and caught tracking have device-local storage and validated JSON backup; teams have six ordered URL-persisted slots, backups and defensive type coverage.
- Details support saved varieties, shiny artwork, four languages for species names/descriptions, game-specific moves and encounters, and explicit fallback labels.
- Production offline support caches the shell, core data and bounded visited resources, with an explicit Reload to update flow. Discovery includes random entries and a four-choice type quiz.
- Deferred worker registration and immutable HTTP cache reuse prevent duplicate catalogue downloads. CI enforces transfer, card-count and catalogue-request budgets.

## Current saved data

| Dataset           | Published version                    | Coverage                                 |
| ----------------- | ------------------------------------ | ---------------------------------------- |
| Default catalogue | `f543ff5c327b41a9`                   | 1,025 species and 540 evolution families |
| Varieties         | `a09415e87011bed7`                   | 1,351 varieties across 1,025 species     |
| Game reference    | `bd235acbb4d65e7e`                   | 1,025 species and 32 game groups         |
| Type chart        | `client/public/data/type-chart.json` | 18 types and 324 relationships           |

Manifests select the published versions. Retain prior version directories for rollback and existing clients. The game references occupy about 35 MB on disk and load per species. A fresh checkout uses these committed files; routine development does not need an upstream refresh.

## Run and verify

Use Node.js 22.13 or newer. Install dependencies with `npm ci`, then use `npm run dev` for normal development. Tests build their own production preview under `/PokemonPedia/` on port 4173; keep that port free. Development mode does not install the offline worker.

```sh
npm run check
npm run lint
npm run format:check
npm test
npx playwright install chromium
npm run test:e2e
npm run benchmark:check
npm audit
```

The final local validation has 23 passing unit/API tests and 19 passing browser scenarios, passing type/lint/format/build checks, passing deterministic performance budgets, and zero reported dependency vulnerabilities. These are Chromium lab results; the next session should rerun checks for its changes and inspect remote CI separately.

`docs/performance-baseline.json` retains the recorded lab run: cold median 4.45 seconds, warm median 1.89 seconds, about 0.37 seconds search response including debounce, 259.4 KiB cold same-origin transfer, and 40 initial cards. Its media-blocked throttled profile and unthrottled worker probe are described in the report. `npm run benchmark:check` writes a disposable report under ignored `tmp/review`; it does not replace the baseline. To publish a new measured baseline, build, run `npm run benchmark`, run `npx tsx scripts/performance-report.ts`, and update the documented results and limitations together.

For offline browser review, build and preview on localhost, allow the first online setup to finish, then reload offline. Existing tabs keep their installed snapshot until Reload to update. Collections and quiz scores belong to the browser origin; export collections before moving to another host or port. Temporary QA renders, raw cache, builds and test output stay local and are ignored by Git.

## Next priorities

1. Evaluate a compact catalogue index with separate detail files against the saved baseline. Measure transfer, first-results/search behavior, comparison and team loading, and offline availability before accepting a design change. The current complete catalogue is about 950 kB uncompressed.
2. Check full-media loading, globally shaped worker installation, other browser engines, screen readers, live audio and physical touch devices. Measure field performance and actual-host compression/cache behavior once a hosting destination is authorized.
3. Expand translations beyond species names/descriptions if requested. Interface labels and form, move and location identifiers remain English; current types/stats are not historical game values.
4. Prepare the chosen host's absolute social preview image and verify deployment rollback. For a GitHub repository site at this remote, the base would be `/Poke-Pedia/`; `/PokemonPedia/` is the browser-test/local-review fixture. No public deployment has been performed.

## Data and documentation maintenance

Use `npm run data:sync`, `data:types`, `data:forms`, and `data:reference` only when a saved-data refresh is intended. Generate the catalogue before varieties and reference data. Each generator shares `.cache/pokeapi`, bounded retries and the refresh lock, validates before publishing, and retains the current manifest on failure. Do not import upstream data during visits, commit partial snapshots, or remove a lock while a refresh is running.

After each completed implementation step, update `docs/update-log.json` with concrete changes, validation and limits. Keep README, progress, this handoff and verification evidence consistent. Refresh the Word appendix with `scripts/update-plan.py`, export/render its matching PDF with `scripts/render-plan.ps1`, and visually inspect the resulting pages before delivering. These document helpers rely on the bundled Codex Python/Poppler paths and installed Microsoft Word on this workstation; adjust dependencies when using another machine. Preserve the original audit as historical context.
