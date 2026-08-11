---
"@transcend-io/cli": minor
"@transcend-io/sdk": major
---

Support per-workflow deletion dependencies in `transcend.yml`. Entries under `deletion-dependencies` may now be objects with an optional `workflow` to override the global configuration for a single DSR workflow, or `reset-to-global: true` to remove an override. The existing list of data silo titles is still supported.

`syncDataSiloDependencies` now takes `[dataSiloId, DependedOnDataSiloInput[]][]` instead of `[dataSiloId, string[]][]` and pushes through `dependedOnDataSilos` rather than the deprecated `dependedOnDataSiloTitles`.
