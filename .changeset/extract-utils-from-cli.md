---
'@transcend-io/utils': minor
'@transcend-io/cli': patch
---

Extract shared utilities from CLI into @transcend-io/utils

Move generic helpers (splitInHalf, retrySamePromise, sleepPromise, extractErrorMessage, getErrorStatus, limitRecords, RateCounter, time, chunkOneCsvFile) and a Logger interface into @transcend-io/utils for use outside the CLI. The CLI now imports these from @transcend-io/utils instead of its own lib/helpers.
