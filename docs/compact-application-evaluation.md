# Lossless compact catalogue application evaluation

Evaluated on 12 October 2026 against snapshot `f543ff5c327b41a9`. The opt-in compact build preserves every normalized catalogue field and the complete default-variety offline experience. It saves 10.1% of measured cold application transfer in this run. Cold timing medians are similar, so the standard build remains the default and no startup-speed improvement is claimed.

## What changed

The earlier [split-index experiment](catalogue-evaluation.md) removed summary fields and needed per-species requests. The current summary components use nearly all those fields, including descriptions, abilities and cries in comparison. This alternative retains them all in one lossless transport: ordered columns, a shared dictionary for repeated labels/abilities, URL-prefix dictionaries, and six ordered stats. Decoding restores the existing model and validates it with the same catalogue schema. Species and variety IDs, nullable media, hidden abilities, fractional measurements, flags and family IDs are preserved.

The build derives `catalogue.compact-v1.json` from the committed catalogue and asserts an exact normalized round trip before emitting it. No source manifest or saved snapshot is edited and no upstream data is requested. The separate filename avoids reusing the immutable standard URL for different content. Future incompatible transport changes must use a new filename and encoding version.

`VITE_COMPACT_CATALOGUE=1` selects this production-build experiment. The client, generated precache and benchmark counter agree on the chosen file. Each worker saves one catalogue representation and reuses its HTTP cache; data/media cache bounds and explicit update handling remain in place. Development mode continues using the standard committed catalogue even if the flag is present.

```sh
npm run build:compact
npm run preview
npm run test:e2e:compact
# Builds both variants separately and replaces only the matched evaluation JSON:
npm run benchmark:catalogue
# Return dist/public to the standard production build:
npm run build
```

The comparison builds under ignored `tmp/review/catalogue-build-comparison`; it does not replace `dist/public`. The ordinary build, preview, tests and benchmark commands retain their existing defaults. Source manifests and the optional server API still use the standard catalogue.

## Matched application results

[Retained evidence](compact-application-evaluation.json) includes both complete benchmark reports, all samples, runtime, profile and budget results. Each variant uses the real application under `/PokemonPedia/`, three cold contexts, three warm document reloads, normal HTTP caching, 390 by 844 pixels, 150 ms latency, 1.6 Mbps download, 750 kbps upload and 4x CPU slowdown. Known artwork/cry hosts and workers are blocked for core timing. Worker installation is measured separately without throttling.

| Metric                                             |      Standard |       Compact |
| -------------------------------------------------- | ------------: | ------------: |
| Catalogue raw bytes                                |       949,237 |       316,937 |
| Catalogue gzip bytes                               |       136,042 |       109,102 |
| Cold application transfer median                   | 266,001 bytes | 239,079 bytes |
| Cold first-results median                          |        5.26 s |        5.31 s |
| Cold first-results range                           |   5.14-5.57 s |   5.27-5.50 s |
| Warm first-results median                          |        2.53 s |        2.42 s |
| Search median including debounce, cold             |       0.379 s |       0.395 s |
| Initially mounted cards                            |            40 |            40 |
| Actual catalogue HTTP requests during installation |             1 |             1 |

The gzip catalogue saving is 26,940 bytes (19.8%); the measured cold same-origin application saving is 26,922 bytes (10.1%). The decoder/build differences slightly affect JavaScript delivery. Warm application transfer is 1,500 bytes for both variants. Both pass existing deterministic budgets. Two browser fetch operations can correspond to one actual server download because the worker reuses HTTP cache.

The standard variant ran first, followed by compact, on the same machine; mode order was not randomized. Timings include browser automation overhead, parsing, validation and rendering. Sample ranges overlap and warm results vary. This establishes a transfer reduction for this profile, rather than a causal timing win. It neither replaces nor contradicts the original 4.45/1.89 second historical baseline. These are Chromium/Vite-preview lab results, with media blocked; they are not field Web Vitals, full-media loads, global worker shaping or physical-device measurements.

## Validation and decision

Four added unit tests validate complete round trips for all 1,025 species, deterministic encoding, null media and fractional/form identity, and rejection of unknown encodings, invalid columns, truncated rows, bad dictionary references, incorrect stats, invalid reconstructed URLs and duplicate IDs. The cumulative unit/API suite has 27 tests.

The application suite now has 21 scenarios. Compact mode passed malformed-transport retry, search/layout/details, collections, forms, references, comparison and teams, offline document reload, unvisited default summary/comparison availability, 45 visited family fetches evicting down to exactly 40, and explicit worker updates retaining the preceding version. These validate actual application behavior rather than the earlier Cache API harness. Standard-mode regression results are tracked in [verification](verification.json).

Retain the compact build as a verified opt-in transport and keep the standard default. Subsequent [worker validation](transport-offline-validation.md) verifies actual Chromium updates in both directions, failed-install recovery and six shared-pacing installations. [Browser-engine validation](browser-engine-validation.md) now passes the complete functional matrix for both modes in Chromium, Firefox and WebKit. Before changing the default, evaluate isolated decoder cost and complete-media/field conditions; functional test timings do not establish a speedup. Actual hosting compression/cache policies, physical touch devices, screen readers, live audio and public deployment rollback remain release work. The prototype introduces no account or deployment changes.
