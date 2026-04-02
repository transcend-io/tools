---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move identifier & data subject functions from CLI to SDK

- Add `dsr-automation/` module to SDK: `fetchAllRequestIdentifiers`, `fetchAllRequestIdentifierMetadata`, `fetchDataSubjects`, `syncDataSubject`, `fetchIdentifiers`, `syncIdentifier`
- All imports updated to use `@transcend-io/sdk` directly
