# Catalogue transport updates and offline installation

Validated on 12 October 2026 using the actual standard and compact production builds. Both update directions preserve local favorites and complete default summaries, comparison and teams offline. A failed standard-to-compact installation leaves the active snapshot usable and recovers after retry. Six installations under shared response pacing pass with one actual catalogue HTTP request each.

## Reproduce and retained evidence

```sh
npm run validate:offline-transports
```

The command builds both variants under ignored `tmp/review/offline-transports`, starts local Vite previews behind one same-origin proxy, and launches Chromium. It closes its browser and servers afterward. It never changes source manifests, upstream data, the standard build default, accounts or a public host. The [JSON evidence](transport-offline-validation.json) preserves worker versions, migration results, every installation sample and request logs. The successful recorded run reused the two builds freshly generated in this batch while correcting the probe to accept valid HTTP 304 cache revalidations; `reuseBuilds` records that fact. The normal command rebuilds both variants. No application behavior changed during that probe correction.

## Step one Worker representation migration

The proxy serves a standard build, waits for its worker to control the page, then switches the underlying served files to compact. A real worker update must prepare and wait; the user-facing Reload to update button applies it. The reverse direction is tested in a fresh context. These use the genuine build scripts and catalogue files, rather than replacing only a worker version string.

Both directions pass these assertions:

- The new worker waits for explicit reload.
- The preceding core cache remains alongside the new core.
- The new core contains exactly the selected catalogue representation.
- A saved Favorite choice survives the update on the same origin.
- An offline document reload supports comparison, teams and an unvisited default summary with its original stats.

The standard-to-compact case first forces a 503 response for the new compact catalogue. Its installing worker becomes redundant, no waiting worker replaces the active worker, and the old snapshot still reloads offline. Restoring the response and retrying then completes the update. This verifies local failed-install preservation and recovery; it does not claim public hosting rollback has been tested.

## Step two Shared network pacing during installation

Each mode has three fresh browser-context samples. The proxy adds 150 ms response latency and shares a 1.6 Mbps response-body pacing queue across all same-origin requests, including service-worker requests. Browser events confirm worker requests for route assets, while proxy logs show they receive the same pacing policy as page requests. HTTP 304 responses represent successful cached revalidation and contribute no body bytes.

| Median metric                               |   Standard |    Compact |
| ------------------------------------------- | ---------: | ---------: |
| First catalogue results                     |     2.70 s |     2.68 s |
| Worker ready and controlling                |     4.12 s |     3.96 s |
| Proxy-observed body bytes through readiness |    294,966 |    268,026 |
| Catalogue HTTP requests per sample          |          1 |          1 |
| Offline reload and workflows                | Passed 3/3 | Passed 3/3 |

All six samples complete installation, retain 40 initially mounted cards and pass offline reload, comparison, team and unvisited default-summary checks. Body totals include same-origin shell, assets and saved data through readiness. They exclude headers, browser-cached bodies and blocked media. The compact saving for this preparation profile is 26,940 body bytes. This is a separate measurement from the earlier application transfer report.

The scheduler is an application-level proxy, not a complete TCP network simulator. CPU and upload are unshaped; media hosts are blocked. The modes run sequentially, and timings include browser automation. These results cannot be compared directly with the 4x CPU-constrained core baseline or used as field Web Vitals. They validate local installation under shared response pacing, rather than every public network or host behavior.

## Remaining release work

The standard build remains the default and compact is opt-in. The subsequent [browser-engine validation](browser-engine-validation.md) covers the complete functional suite in Chromium, Firefox and WebKit for both modes. This report's representation migrations and shared-pacing profile remain Chromium-specific. Full-media loading and live audio, screen readers, physical touch devices, isolated decoder profiling, field performance and actual-host compression/cache/rollback checks remain. CI runs the migration and shared-pacing command alongside both application-mode matrices and deterministic budgets. These changes remain local; remote CI and a public deployment have not been performed.
