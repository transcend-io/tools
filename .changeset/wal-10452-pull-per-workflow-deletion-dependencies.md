---
"@transcend-io/cli": minor
"@transcend-io/sdk": minor
---

`transcend inventory pull` now writes per-workflow deletion dependencies into `transcend.yml`. Global-only configs stay as a list of titles; once any override exists, the whole field is written as objects. Overrides on workflows without an internal name are skipped with a warning, since `transcend.yml` references workflows by internal name.

`DataSiloEnriched` gains `dependedOnDataSilosPerWorkflow`.
