---
'@transcend-io/internationalization': patch
---

Remove the redundant `@transcend-io/internationalization` entry from the pnpm workspace `catalog`. The package now lives in this monorepo and is consumed via the `workspace:*` protocol, so the catalog version range was unused and only caused Renovate to open no-op version-bump PRs (e.g. #137).
