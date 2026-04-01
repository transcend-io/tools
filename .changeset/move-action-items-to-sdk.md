---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move action items GraphQL functions from CLI to SDK

- Add `assessments/` module to SDK: `fetchAllActionItems`, `fetchAllActionItemCollections`, `syncActionItems`, `syncActionItemCollections`
- All imports updated to use `@transcend-io/sdk` directly
