# PokemonPedia performance baseline

Recorded on 12 October 2026 from the production build using Chromium 156.0.8078.4, Node v22.13.1, and win32/x64. Results describe this lab run and host; they do not establish performance on a physical phone or a public deployment.

## Core loading results

Three fresh browser contexts were each followed by a warm document reload. The profile was 390 × 844 pixels, 150 ms latency, 1.6 Mbps download, 750 kbps upload, and 4× CPU slowdown. Vite preview supplied gzip compression, and normal HTTP caching stayed enabled. Known artwork/cry hosts and service workers were blocked for these timing samples so application/data delivery could be measured consistently.

| Metric                                    | Cold median | Warm median |
| ----------------------------------------- | ----------: | ----------: |
| First catalogue results                   |      4.45 s |      1.89 s |
| First-results sample range                | 4.36–4.68 s | 1.87–2.11 s |
| Name/number search response               |      0.37 s |      0.37 s |
| Same-origin transfer including navigation |   259.4 KiB |     1.5 KiB |
| Initially mounted cards                   |          40 |          40 |

Search response includes the deliberate 300 ms debounce and automation observation overhead. Transfer values come from browser Resource Timing, rather than a packet capture. First-results time includes navigation, loading, parsing, rendering and polling. These are not Lighthouse scores, INP or artwork-inclusive Web Vitals. Host load and browser startup affect timings; all individual samples are retained in performance-baseline.json.

## Offline preparation improvement

Registration now waits until catalogue data is available and a frame has painted. Versioned catalogue URLs and current hashed build assets can reuse the browser HTTP cache; shell and manifest requests still refresh. This preserves the existing explicit update flow and atomic snapshot behavior.

A separate unthrottled controlled installation comparison used the same updated application and deferred installer, changing only the worker's immutable-file cache policy. The reload-policy fixture produced **2 catalogue HTTP requests**, while the current policy produced **1**. Browser fetch operations still number two because one can be served from HTTP cache. This comparison establishes the duplicate-download fix; it is not a before/after claim about overall startup speed.

## Repeatable guardrails

CI runs npm run benchmark:check after the browser suite. It enforces cold same-origin transfer at or below 280 KiB, at most 40 initial cards, and at most one catalogue HTTP request during offline installation. Current checks: coldApplicationBytes: pass, mountedCards: pass, catalogueHttpRequests: pass. Timing values remain informational because machine load varies.

Use npm run build followed by npm run benchmark to regenerate the baseline. The script launches and closes its own preview server. The three JSON reports preserve the measured baseline and cache-policy controls.

## Remaining work

The subsequent [lossless application evaluation](compact-application-evaluation.md) records a compatible opt-in format, all-field round trips, actual route/offline/cache/update validation and matched standard/compact builds. Cold application transfer falls by 10.1% in that run, with similar cold medians. It preserves full default-variety offline coverage; standard builds remain the default and this historical baseline stays intact.

[Worker validation](transport-offline-validation.md) subsequently verifies both representation update directions, failed-install recovery and six offline installations behind shared page/worker response-body pacing. It records 4.12/3.96 second standard/compact readiness medians with CPU/upload unshaped and media blocked. This separate proxy profile does not replace the original CPU-constrained baseline or establish field performance.

[Browser-engine validation](browser-engine-validation.md) now verifies all 22 functional scenarios in Chromium, Firefox and WebKit for both modes, with fixes for stale URL callbacks and native control contrast. Post-fix deterministic budgets also pass for both builds. Those temporary budget reports and functional durations do not replace this historical baseline or measure isolated decoder cost. Minimum versions, real media/audio, physical devices and field/host validation remain.

Cold loading is still several seconds on this constrained profile. The historical split candidate remains deferred; the later lossless prototype and worker checks are linked above. Verify compression and cache behavior on the eventual host or optional Express wrapper; the original application measurements apply to Vite preview. Artwork-inclusive loading, other engines, physical devices and field Web Vitals remain separate checks. The shared worker profile models response latency and body pacing rather than a complete mobile network. No public hosting change or deployment was made.
