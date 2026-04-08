# @transcend-io/sdk

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
