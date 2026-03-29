---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
'@transcend-io/utils': minor
---

Move preference-management domain logic from CLI to SDK

- Extract 17 preference-management files (codecs, types, conflict detection, retry, consent fetching, chunking, transforms) from packages/cli into packages/sdk
- Inject Logger interface instead of CLI's global console logger
- Replace cli-progress bars with onProgress callbacks
- Strip colors dependency from SDK — log messages are plain strings
- Add io-ts and @transcend-io/type-utils as SDK dependencies
