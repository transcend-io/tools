---
'@transcend-io/utils': minor
'@transcend-io/cli': minor
---

Move generic pooling infrastructure from CLI to @transcend-io/utils

- Move runPool, spawnWorkerProcess, logRotation, types, ensureLogFile, safeGetLogPathsForSlot from packages/cli to packages/utils
- Strip colors dependency, make installInteractiveSwitcher injectable callback
- Replace openLogWindows boolean with onLogFilesCreated callback
- Add @transcend-io/type-utils dependency to utils
