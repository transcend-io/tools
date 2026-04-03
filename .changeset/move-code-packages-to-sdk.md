---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
'@transcend-io/privacy-types': patch
---

Move code package and DSR automation functions from CLI to SDK

- Add `code-intelligence/` module to SDK: `fetchAllCodePackages`
- Extend `dsr-automation/` in SDK: actions, templates, catalogs, silo discovery (`fetchAllActions`, `syncAction`, `fetchAllTemplates`, `syncTemplate`, `fetchAllCatalogs`, `fetchAndIndexCatalogs`, `uploadSiloDiscoveryResults`, `fetchAllSiloDiscoveryResults`, `fetchActiveSiloDiscoPlugin`)
- Extend `dsr-automation/` in SDK: request data silos and files (`fetchRequestDataSilo`, `fetchRequestDataSilos`, `fetchRequestDataSilosCount`, `fetchRequestFilesForRequest`, `fetchAllRequestAttributeKeys`, `formatAttributeValues`, and related GQL queries)
- All imports updated to use `@transcend-io/sdk` directly
