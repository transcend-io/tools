---
"@transcend-io/cli": minor
"@transcend-io/sdk": minor
---

`transcend inventory pull` now writes per-workflow deletion dependencies into `transcend.yml`. Global dependencies keep the existing list-of-titles shorthand, and each workflow that overrides them is written as its own entry. Overrides on workflows without an internal name are skipped with a warning, since `transcend.yml` references workflows by internal name.

`DataSiloEnriched` gains `dependedOnDataSilosPerWorkflow`.
