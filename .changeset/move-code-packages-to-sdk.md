---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
'@transcend-io/privacy-types': patch
---

Move code package and DSR automation functions from CLI to SDK

- Add `code-intelligence/` module to SDK: `fetchAllCodePackages`
- Add `dsr-automation/` module to SDK: `fetchRequestDataSilo`, `fetchRequestDataSilos`, `fetchRequestDataSilosCount`, `fetchRequestFilesForRequest`, `fetchAllRequestAttributeKeys`, `formatAttributeValues`, and related GQL queries
- All imports updated to use `@transcend-io/sdk` directly
