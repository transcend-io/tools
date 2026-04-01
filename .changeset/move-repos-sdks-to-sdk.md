---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move repository and software development kit functions from CLI to SDK

- Add to `code-intelligence/` module in SDK: `fetchAllRepositories`, `syncRepositories`, `fetchAllSoftwareDevelopmentKits`, `syncSoftwareDevelopmentKits`
- All imports updated to use `@transcend-io/sdk` directly
