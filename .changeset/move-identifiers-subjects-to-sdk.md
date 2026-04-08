---
'@transcend-io/sdk': major
'@transcend-io/cli': minor
---

Move identifier & data subject functions from CLI to SDK + standardize signatures

- Add `dsr-automation/` module to SDK: `fetchAllRequestIdentifiers`, `fetchAllRequestIdentifierMetadata`, `fetchDataSubjects`, `syncDataSubject`, `fetchIdentifiers`, `syncIdentifier`
- **Standardize all new SDK function signatures** to the `(client, options)` convention
- Make `logger` optional across every new SDK function; use `NOOP_LOGGER` default
- Filters nested under `filterBy`; create/update data nested under `input`
- All imports updated to use `@transcend-io/sdk` directly
