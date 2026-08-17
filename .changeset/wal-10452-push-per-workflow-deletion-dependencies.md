---
"@transcend-io/cli": minor
"@transcend-io/sdk": major
---

Support per-workflow deletion dependencies in `transcend.yml`. Use a list of titles for the global configuration only, or a list of objects when any per-workflow override is present (`{ titles }` for global, `{ workflow, titles }` or `{ workflow, reset-to-global: true }` for overrides). Mixing titles and objects in the same list is not allowed.

`syncDataSiloDependencies` now takes `[dataSiloId, DependedOnDataSiloInput[]][]` instead of `[dataSiloId, string[]][]` and pushes through `dependedOnDataSilos` rather than the deprecated `dependedOnDataSiloTitles`.
