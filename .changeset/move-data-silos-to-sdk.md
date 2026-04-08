---
'@transcend-io/sdk': minor
'@transcend-io/cli': patch
---

feat(sdk): move data silo & datapoint GraphQL helpers to SDK

- Move `fetchAllDataSilos`, `fetchAllDataPoints`, `fetchAllSubDataPoints`, `fetchEnrichedDataSilos` from CLI to SDK `data-inventory/` module
- Move `syncDataSiloDependencies` from CLI to SDK `data-inventory/` module
- Move data silo and datapoint GQL queries (`DATA_SILOS`, `DATA_SILO_EXPORT`, `DATA_SILOS_ENRICHED`, `CREATE_DATA_SILOS`, `UPDATE_DATA_SILOS`, `DATA_POINTS`, `DATA_POINT_COUNT`, `SUB_DATA_POINTS`, `SUB_DATA_POINTS_COUNT`, `SUB_DATA_POINTS_WITH_GUESSES`, `UPDATE_OR_CREATE_DATA_POINT`, `DATAPOINT_EXPORT`) from CLI to SDK
- Move types (`DataSilo`, `DataSiloEnriched`, `DataSiloAttributeValue`, `SubDataPoint`, `DataPoint`, `DataPointWithSubDataPoint`) to SDK
- Standardize all new SDK function signatures to `(client, options)` convention with optional `logger`
- Delete `cli/src/lib/graphql/gqls/dataSilo.ts` and `cli/src/lib/graphql/gqls/dataPoint.ts`
- CLI re-exports moved symbols from `@transcend-io/sdk` for backward compatibility
