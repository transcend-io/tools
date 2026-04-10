# @transcend-io/sdk

## 1.0.0

### Major Changes

- f7a5c54: Move enricher functions from CLI to SDK + standardize function signatures
  - Add `dsr-automation/` module to SDK: `fetchAllRequestEnrichers`, `retryRequestEnricher`, `fetchAllEnrichers`, `syncEnricher`
  - Migrate GQL definitions: `ENRICHERS`, `CREATE_ENRICHER`, `UPDATE_ENRICHER`, `INITIALIZER`, `REQUEST_ENRICHERS`, `RETRY_REQUEST_ENRICHER`, `SKIP_REQUEST_ENRICHER`
  - **BREAKING**: Standardize all new SDK function signatures to the `(client, options)` convention
    - `fetchAllRequestEnrichers`: `(client, filterOptions, opts)` → `(client, { filterBy, logger? })`
    - `fetchAllEnrichers`: `(client, { title?, logger })` → `(client, { filterBy?: { title? }, logger? })`
    - `retryRequestEnricher`: `(client, id, opts)` → `(client, { id, logger? })`
    - `syncEnricher`: `(client, syncOptions, opts)` → `(client, { input, identifierByName, dataSubjectsByName, logger? })`
  - Make `logger` optional across every SDK function; default to `NOOP_LOGGER`
  - All CLI imports updated to use `@transcend-io/sdk` directly

- 00b9d23: Move identifier & data subject functions from CLI to SDK + standardize signatures
  - Add `dsr-automation/` module to SDK: `fetchAllRequestIdentifiers`, `fetchAllRequestIdentifierMetadata`, `fetchDataSubjects`, `syncDataSubject`, `fetchIdentifiers`, `syncIdentifier`
  - **Standardize all new SDK function signatures** to the `(client, options)` convention
  - Make `logger` optional across every new SDK function; use `NOOP_LOGGER` default
  - Filters nested under `filterBy`; create/update data nested under `input`
  - All imports updated to use `@transcend-io/sdk` directly

- 896364c: Standardize SDK function signatures to follow `(client, options)` convention

  BREAKING CHANGES:
  - `fetchRequestDataSilosCount`, `fetchRequestDataSilos`, `fetchRequestDataSilo`: collapse separate filter + options params into single `options: { logger, filterBy? }`
  - `fetchRequestFilesForRequest`: collapse 4 positional params into `(client, options: { logger, pageSize?, filterBy })`
  - `fetchAllCookies`, `fetchAllDataFlows`: move `status` param into `options.filterBy.status`
  - `updateDataFlows`, `createDataFlows`, `syncDataFlows`: move `classifyService` boolean into options object
  - `loginUser`, `assumeRole`: separate logger from domain data into `(client, credentials, { logger })`
  - `fetchAllTemplates`: move `title` filter into `options.filterBy.title`
  - `fetchPromptsWithVariables`: move `promptTitles`/`promptIds` into `options.filterBy.titles`/`options.filterBy.ids`
  - `fetchAllApiKeys`: move `titles` filter into `options.filterBy.titles`
  - `fetchApiKeys`: move `client` to first param, collapse `apiKeyInputs`/`fetchAll` into options

### Minor Changes

- 8185679: feat(sdk): split consent GQL queries into domain files with shared types

  **SDK (`@transcend-io/sdk`):**
  - Split monolithic `consent/gqls/consentManager.ts` (800+ lines) into domain-focused modules: `cookies.ts`, `dataFlows.ts`, `experiences.ts`, `purposes.ts`, `partitions.ts`, `stats.ts`, `consentManager.ts`
  - Add shared field selection constants (`SERVICE_FIELDS`, `TRACKING_PURPOSE_FIELDS`, `OWNER_FIELDS`, `TEAM_FIELDS`, `ATTRIBUTE_VALUE_FIELDS`) to deduplicate GQL field lists across queries
  - Add `Transcend*Gql` response types next to every GQL constant (e.g. `TranscendCliCookiesResponse`, `TranscendCliDataFlowsResponse`)
  - Add missing GQL queries: `PURPOSES`, `COOKIE_STATS`, `DATA_FLOW_STATS`, `DELETE_COOKIES`, `DELETE_DATA_FLOWS`
  - Extend `DATA_FLOWS` and `COOKIES` queries with parameterized `$filterBy`/`$orderBy` variables and triage fields (`occurrences`, `frequency`, `purposes`, etc.)
  - Extend `UPDATE_DATA_FLOWS` mutation to return full data flow fields
  - Add `totalCount` to `EXPERIENCES` query response
  - Add `id` to owners, teams, and attribute values in all GQL selections
  - Move generic types (`TranscendOwnerGql`, `TranscendTeamGql`, `TranscendAttributeValueGql`) to SDK-wide `gqls/shared.ts`
  - Delete redundant type aliases (`Cookie`, `DataFlow`, `ConsentManagerTheme`, `TranscendPartition`) from fetch/sync files; use GQL types directly
  - Expose optional `orderBy` parameter in `fetchAllDataFlows` and `fetchAllCookies`
  - Add barrel exports: `consent/gqls/index.ts` and `gqls/index.ts`

  **Privacy Types (`@transcend-io/privacy-types`):**
  - Add `OrderDirection` enum (`Asc = 'ASC'`, `Desc = 'DESC'`)

  **MCP Server Core (`@transcend-io/mcp-server-core`):**
  - Make `TranscendGraphQLBase.makeRequest` public (was `protected`)
  - Remove consent-specific types from `types/transcend.ts` (moved to SDK)
  - Remove `@transcend-io/privacy-types` re-exports (consumers import directly)

  **MCP Server Consent (`@transcend-io/mcp-server-consent`):**
  - **BREAKING:** Delete `graphql.ts` (`ConsentMixin`) — tools now call `makeRequest` directly with GQL from SDK
  - **BREAKING:** Remove `airgap_bundle_id` from all tool inputs — auto-resolved from API key via `resolveAirgapBundleId`
  - **BREAKING:** Merge `consent_list_triage_cookies`/`consent_list_triage_data_flows` into `consent_list_cookies`/`consent_list_data_flows` with required `status` filter
  - **BREAKING:** Rename tool `consent_list_triage_cookies` → `consent_list_cookies`, `consent_list_triage_data_flows` → `consent_list_data_flows`
  - Replace hardcoded regimes with real `EXPERIENCES` API call
  - Add `show_zero_activity` support to `consent_get_triage_stats`
  - Use `ConsentTrackerStatus`/`OrderDirection` enums from `@transcend-io/privacy-types` instead of hardcoded strings
  - Import all GQL response types from SDK — zero inline `makeRequest<{...}>` type parameters

  **Future work:** Reuse SDK fetch functions (`fetchAllDataFlows`, `fetchConsentManagerExperiences`) directly once `TranscendGraphQLBase` is compatible with `graphql-request`'s `GraphQLClient` interface.

- 6f2a059: feat(sdk): move data silo & datapoint GraphQL helpers to SDK
  - Move `fetchAllDataSilos`, `fetchAllDataPoints`, `fetchAllSubDataPoints`, `fetchEnrichedDataSilos` from CLI to SDK `data-inventory/` module
  - Move `syncDataSiloDependencies` from CLI to SDK `data-inventory/` module
  - Move data silo and datapoint GQL queries (`DATA_SILOS`, `DATA_SILO_EXPORT`, `DATA_SILOS_ENRICHED`, `CREATE_DATA_SILOS`, `UPDATE_DATA_SILOS`, `DATA_POINTS`, `DATA_POINT_COUNT`, `SUB_DATA_POINTS`, `SUB_DATA_POINTS_COUNT`, `SUB_DATA_POINTS_WITH_GUESSES`, `UPDATE_OR_CREATE_DATA_POINT`, `DATAPOINT_EXPORT`) from CLI to SDK
  - Move types (`DataSilo`, `DataSiloEnriched`, `DataSiloAttributeValue`, `SubDataPoint`, `DataPoint`, `DataPointWithSubDataPoint`) to SDK
  - Standardize all new SDK function signatures to `(client, options)` convention with optional `logger`
  - Delete `cli/src/lib/graphql/gqls/dataSilo.ts` and `cli/src/lib/graphql/gqls/dataPoint.ts`
  - CLI re-exports moved symbols from `@transcend-io/sdk` for backward compatibility

### Patch Changes

- a15fed8: Bump `@transcend-io/internationalization` from ^2.3.2 to ^3.0.0.
- d3f8140: fix: remove unsupported pageInfo from consent GQL queries and unused filterBy from stats queries
- Updated dependencies [a15fed8]
- Updated dependencies [8185679]
- Updated dependencies [29868af]
  - @transcend-io/privacy-types@5.1.0

## 0.1.0

### Minor Changes

- 119a47a: Move action items GraphQL functions from CLI to SDK
  - Add `assessments/` module to SDK: `fetchAllActionItems`, `fetchAllActionItemCollections`, `syncActionItems`, `syncActionItemCollections`
  - All imports updated to use `@transcend-io/sdk` directly

- d0d35a0: Move attribute, setResourceAttributes, and formatRegions functions from CLI to SDK
  - Add attribute management to `administration/` module in SDK: `fetchAllAttributes`, `syncAttribute`, `setResourceAttributes`, `formatRegions`
  - Export `attributeKey` GQL constants (`ATTRIBUTE_KEYS_REQUESTS`) from SDK for consumers
  - All imports updated to use `@transcend-io/sdk` directly

- 05716b8: Move auth, API keys, teams, and user GraphQL functions from CLI to SDK
  - Add `administration/` module to SDK: `loginUser`, `assumeRole`, `fetchAllTeams`, `syncTeams`, `fetchAllUsers`, `fetchApiKeys`, `fetchAllApiKeys`, `createApiKey`, `deleteApiKey`
  - Remove `colors` dependency from SDK - log messages are plain strings
  - All imports updated to use `@transcend-io/sdk` directly

- 1c0534e: Move business entities, vendors, and intl messages from CLI to SDK
  - Add to `data-inventory/` module in SDK: `fetchAllBusinessEntities`, `syncBusinessEntities`, `fetchAllVendors`, `syncVendors`
  - Add to `administration/` module in SDK: `fetchAllMessages`, `syncIntlMessages`
  - All imports updated to use `@transcend-io/sdk` directly

- 40c8524: Move agent GraphQL functions from CLI to SDK
  - Add `ai/` module to SDK: `fetchAllAgents`, `syncAgents`, `fetchAllAgentFiles`, `syncAgentFiles`, `fetchAllAgentFunctions`, `syncAgentFunctions`
  - Add `@types/json-schema` to SDK, normalize CLI version to `catalog:`
  - All imports updated to use `@transcend-io/sdk` directly

- 2493ea0: Move assessment fetch and GQL definitions from CLI to SDK
  - Add `fetchAllAssessments` to `assessments/` module in SDK
  - Move `gqls/assessment.ts` to SDK
  - All imports updated to use `@transcend-io/sdk` directly

- b737da6: Move assessment parsing functions from CLI to SDK
  - Add `parseAssessmentDisplayLogic` and `parseAssessmentRiskLogic` to `assessments/` module in SDK
  - All imports updated to use `@transcend-io/sdk` directly

- 415887f: Move code package fetch functions from CLI to SDK
  - Add `code-intelligence/` module to SDK: `fetchAllCodePackages`
  - Add `dsr-automation/` module to SDK: actions, templates, catalogs, silo discovery
  - Migrated: `fetchAllActions`, `syncAction`, `fetchAllTemplates`, `syncTemplate`, `fetchAllCatalogs`, `fetchAndIndexCatalogs`, `uploadSiloDiscoveryResults`, `fetchAllSiloDiscoveryResults`, `fetchActiveSiloDiscoPlugin`
  - All imports updated to use `@transcend-io/sdk` directly

- 7c3bd44: Move consent manager core functions from CLI to SDK
  - Add `consent/` module to SDK: `fetchConsentManager`, `fetchConsentManagerId`, `fetchConsentManagerExperiences`, `fetchConsentManagerAnalyticsData`, `fetchConsentManagerTheme`, `createTranscendConsentGotInstance`
  - All imports updated to use `@transcend-io/sdk` directly

- ec80f0b: Move consent manager sync & deploy functions from CLI to SDK
  - Add to `consent/` module in SDK: `syncConsentManager`, `deployConsentManager`, `updateConsentManagerToLatest`, `syncPartitions`, `fetchPartitions`
  - All imports updated to use `@transcend-io/sdk` directly

- ceb9be8: Move cookies and data flows from CLI to SDK
  - Add to `consent/` module in SDK: `fetchAllCookies`, `syncCookies`, `fetchAllDataFlows`, `syncDataFlows`
  - All imports updated to use `@transcend-io/sdk` directly

- c467daf: Move LLM and prompt fetch GraphQL functions from CLI to SDK
  - Add to `ai/` module in SDK: `fetchAllLargeLanguageModels`, `fetchAllPrompts`, `fetchPromptsWithVariables`, `fetchAllPromptGroups`, `fetchAllPromptPartials`, `fetchAllPromptThreads`
  - All imports updated to use `@transcend-io/sdk` directly

- 2669fef: Move preference-management domain logic from CLI to SDK
  - Extract 17 preference-management files (codecs, types, conflict detection, retry, consent fetching, chunking, transforms) from packages/cli into packages/sdk
  - Inject Logger interface instead of CLI's global console logger
  - Replace cli-progress bars with onProgress callbacks
  - Strip colors dependency from SDK — log messages are plain strings
  - Add io-ts and @transcend-io/type-utils as SDK dependencies

- b066787: Move processing activities and data categories from CLI to SDK
  - Add to `data-inventory/` module in SDK: `fetchAllProcessingActivities`, `syncProcessingActivities`, `fetchAllDataCategories`, `syncDataCategories`
  - All imports updated to use `@transcend-io/sdk` directly

- c467daf: Move prompt sync & run GraphQL functions from CLI to SDK
  - Add to `ai/` module in SDK: `syncPrompts`, `syncPromptPartials`, `syncPromptGroups`, `reportPromptRun`, `addMessagesToPromptRun`
  - All imports updated to use `@transcend-io/sdk` directly

- eb65725: Move processing purposes, privacy center, and policies from CLI to SDK consent module
- 01fb917: Move repository and software development kit functions from CLI to SDK
  - Add to `code-intelligence/` module in SDK: `fetchAllRepositories`, `syncRepositories`, `fetchAllSoftwareDevelopmentKits`, `syncSoftwareDevelopmentKits`
  - All imports updated to use `@transcend-io/sdk` directly

- 1d5c5b3: Rename @transcend-io/core to @transcend-io/sdk, make utils and sdk public, move GraphQL/REST API foundation and preference management fetchers into SDK
  - Rename packages/core to packages/sdk (@transcend-io/sdk)
  - Make @transcend-io/utils and @transcend-io/sdk publishable (remove private flag)
  - Add api/ module to SDK: buildTranscendGraphQLClient, makeGraphQLRequest, createSombraGotInstance with Logger DI
  - Add preference-management/ module to SDK: fetchAllPurposes, fetchAllPreferenceTopics, fetchAllPurposesAndPreferences, fetchAllIdentifiers, createPreferenceAccessTokens
  - Move bluebird map/mapSeries wrapper from CLI to @transcend-io/utils

- d777dd4: Add preference upload types and helpers to SDK
  - Add FileFormatState codec (schema-only CSV column mapping without upload receipts)
  - Add RequestUploadReceipts codec (tracks upload progress and results)
  - Add loadReferenceData helper (fetches purposes, topics, identifiers in parallel)
  - Add getPreferenceIdentifiersFromRow helper (extracts identifiers from a CSV row)
  - Add getUniquePreferenceIdentifierNamesFromRow helper (extracts unique identifiers from a CSV row)

### Patch Changes

- cac80a5: Add publint
- Updated dependencies [f08af44]
- Updated dependencies [3aefc21]
- Updated dependencies [c072e20]
- Updated dependencies [415887f]
- Updated dependencies [6909387]
- Updated dependencies [2669fef]
- Updated dependencies [cac80a5]
- Updated dependencies [1d5c5b3]
- Updated dependencies [7816fc0]
  - @transcend-io/privacy-types@5.0.1
  - @transcend-io/utils@0.1.0
