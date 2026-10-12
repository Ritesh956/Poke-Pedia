# Compact catalogue evaluation

Evaluated on 12 October 2026 against saved snapshot `f543ff5c327b41a9`. Keep the complete production catalogue for now. The candidate reduces initial transfer but adds detail requests and loses unvisited default details offline. Application design, published data and worker behavior are unchanged.

## Candidate and validation

The index retains species identity, name, slug, types, measurements, category flags, artwork URL and description. These support all search/sort/filter controls and current box-card descriptions. Other fields load from one full default-variety file per species. Detail files duplicate index fields; a later candidate could remove that duplication with a validated merge model.

`npm run benchmark:index` derives payloads from committed data in memory and runs a local gzip server and isolated Chromium harness. It never publishes a manifest or requests upstream data. The shared filter accepts a structural subset of Pokémon fields without changing runtime behavior. The evaluation asserts identical ordered results for 3,683 cases: every species' number, name and slug, plus every type/sort/category combination. Comparison and team hydration must exactly match source records.

| Payload                         | Raw bytes | Gzip bytes |
| ------------------------------- | --------: | ---------: |
| Complete catalogue              |   949,237 |    136,042 |
| Card-compatible index           |   418,870 |     80,505 |
| All 1,025 separate full details |   948,211 |    495,696 |

Initial gzip data savings are 55,537 bytes (40.8% of catalogue payload), about 20.9% of the earlier 259.4 KiB complete-application transfer baseline. This does not measure a new total application transfer. Precaching the index and all details would require 576,201 gzip body bytes before headers, about 4.2 times the current catalogue and 1,026 files. Separate compression loses cross-record redundancy. This is a file-size estimate, not a measured worker installation.

## Data-path browser measurements

Three fresh contexts per mode each receive a warm reload; mode order alternates by run. Chromium 156.0.8078.4 uses 390 by 844 pixels, 150 ms latency, 1.6 Mbps download, 750 kbps upload and 4x CPU slowdown. Both modes use the same bundled schemas/filter and Cache API loader; warm data comes from Cache API. Forty text cards mount and are observed after a frame. [JSON evidence](catalogue-evaluation.json) retains all samples.

| Median metric                                         |      Complete |        Split |
| ----------------------------------------------------- | ------------: | -----------: |
| Cold data load, validation and text rendering         |      1,487 ms |       957 ms |
| Warm data load, validation and text rendering         |        444 ms |       257 ms |
| Cold data transfer including Resource Timing overhead | 136,342 bytes | 80,805 bytes |
| Warm data transfer                                    |       0 bytes |      0 bytes |
| Cold direct shared-filter search                      |        3.9 ms |       3.2 ms |
| Two comparison records after warm load                |        3.2 ms |       218 ms |
| Six team records after comparison                     |        3.5 ms |       237 ms |

Comparison uses 25 and 133. Team uses 1, 6, 9, 25, 94 and 149, reusing visited 25; detail requests run concurrently. These measure data hydration without route rendering. Search omits the application's 300 ms debounce. The harness excludes application startup, media, manifests and routing. Its timings cannot be compared directly with the 4.45/1.89 second application baseline or claimed as a production speedup. Machine load and polling affect the small sample.

With context and CDP networking disabled, visited details remain available in both modes. Unvisited species 1025 remains available from the complete catalogue and fails in the split candidate. This checks detail-data caching only; no worker, offline document reload, bounded eviction, installation or atomic update is exercised.

## Decision and acceptance work

This historical split candidate remains deferred. The subsequent [lossless application evaluation](compact-application-evaluation.md) retains every field in one compact transport, measures real app loading and verifies retries, offline reload, cache eviction and worker updates. It is available as an opt-in build while the standard default remains unchanged. Its transfer savings are smaller than this split candidate, with complete default catalogue coverage preserved. No deployment or data refresh was performed.
