---
"@transcend-io/airgap.js-types": patch
---

- Enable tsdown `unbundle` mode so `dist/` is emitted as separate compiled files per source module instead of a single bundled artifact per entry. The package `exports` entry (`. → dist/index.mjs`) is unchanged; this mainly affects the on-disk layout under `dist/` for maintainability and clearer source-to-output mapping.
