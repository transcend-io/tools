---
'@transcend-io/cli': patch
'@transcend-io/sdk': patch
---

Improve request export and manual enrichment performance by switching request identifier fetching to cursor pagination with parallel batched lookups, bounding total Sombra connections via a shared concurrency budget. The `request export` command gains a `--maxIdentifierConcurrency` flag (default 200) to tune that budget.
