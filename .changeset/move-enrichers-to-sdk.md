---
'@transcend-io/sdk': major
'@transcend-io/cli': minor
---

Move enricher functions from CLI to SDK + standardize function signatures

- Add `dsr-automation/` module to SDK: `fetchAllRequestEnrichers`, `retryRequestEnricher`, `fetchAllEnrichers`, `syncEnricher`
- Migrate GQL definitions: `ENRICHERS`, `CREATE_ENRICHER`, `UPDATE_ENRICHER`, `INITIALIZER`, `REQUEST_ENRICHERS`, `RETRY_REQUEST_ENRICHER`, `SKIP_REQUEST_ENRICHER`
- **BREAKING**: Standardize all new SDK function signatures to the `(client, options)` convention
  - `fetchAllRequestEnrichers`: `(client, filterOptions, opts)` → `(client, { filterBy, logger? })`
  - `fetchAllEnrichers`: `(client, { title?, logger })` → `(client, { filterBy?: { title? }, logger? })`
  - `retryRequestEnricher`: `(client, id, opts)` → `(client, { id, logger? })`
  - `syncEnricher`: `(client, syncOptions, opts)` → `(client, { input, identifierByName, dataSubjectsByName, logger? })`
- Make `logger` optional across every SDK function; default to `NOOP_LOGGER`
- All CLI imports updated to use `@transcend-io/sdk` directly
