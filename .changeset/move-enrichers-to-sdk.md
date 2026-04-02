---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move enricher functions from CLI to SDK

- Add `dsr-automation/` module to SDK: `fetchAllRequestEnrichers`, `retryRequestEnricher`, `fetchAllEnrichers`, `syncEnricher`
- Migrate GQL definitions: `ENRICHERS`, `CREATE_ENRICHER`, `UPDATE_ENRICHER`, `INITIALIZER`, `REQUEST_ENRICHERS`, `RETRY_REQUEST_ENRICHER`, `SKIP_REQUEST_ENRICHER`
- All CLI imports updated to use `@transcend-io/sdk` directly
