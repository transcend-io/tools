# @transcend-io/cli

## 10.2.0

### Minor Changes

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

### Patch Changes

- a15fed8: Bump `@transcend-io/internationalization` from ^2.3.2 to ^3.0.0.
- 6f2a059: feat(sdk): move data silo & datapoint GraphQL helpers to SDK
  - Move `fetchAllDataSilos`, `fetchAllDataPoints`, `fetchAllSubDataPoints`, `fetchEnrichedDataSilos` from CLI to SDK `data-inventory/` module
  - Move `syncDataSiloDependencies` from CLI to SDK `data-inventory/` module
  - Move data silo and datapoint GQL queries (`DATA_SILOS`, `DATA_SILO_EXPORT`, `DATA_SILOS_ENRICHED`, `CREATE_DATA_SILOS`, `UPDATE_DATA_SILOS`, `DATA_POINTS`, `DATA_POINT_COUNT`, `SUB_DATA_POINTS`, `SUB_DATA_POINTS_COUNT`, `SUB_DATA_POINTS_WITH_GUESSES`, `UPDATE_OR_CREATE_DATA_POINT`, `DATAPOINT_EXPORT`) from CLI to SDK
  - Move types (`DataSilo`, `DataSiloEnriched`, `DataSiloAttributeValue`, `SubDataPoint`, `DataPoint`, `DataPointWithSubDataPoint`) to SDK
  - Standardize all new SDK function signatures to `(client, options)` convention with optional `logger`
  - Delete `cli/src/lib/graphql/gqls/dataSilo.ts` and `cli/src/lib/graphql/gqls/dataPoint.ts`
  - CLI re-exports moved symbols from `@transcend-io/sdk` for backward compatibility

- Updated dependencies [a15fed8]
- Updated dependencies [8185679]
- Updated dependencies [d3f8140]
- Updated dependencies [29868af]
- Updated dependencies [6f2a059]
- Updated dependencies [f7a5c54]
- Updated dependencies [00b9d23]
- Updated dependencies [896364c]
  - @transcend-io/sdk@1.0.0
  - @transcend-io/privacy-types@5.1.0

## 10.1.0

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

- 6909387: Move generic pooling infrastructure from CLI to @transcend-io/utils
  - Move runPool, spawnWorkerProcess, logRotation, types, ensureLogFile, safeGetLogPathsForSlot from packages/cli to packages/utils
  - Strip colors dependency, make installInteractiveSwitcher injectable callback
  - Replace openLogWindows boolean with onLogFilesCreated callback
  - Add @transcend-io/type-utils dependency to utils

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

- 52ae399: Add --actionTypes flag to skip-request-data-silos command for filtering by request action type

### Patch Changes

- f08af44: Add `URL` and `EMAIL` variants to `AssessmentQuestionType` for assessment form questions, and regenerate `transcend.yml` JSON schema.
- 3aefc21: Extract shared utilities from CLI into @transcend-io/utils

  Move generic helpers (splitInHalf, retrySamePromise, sleepPromise, extractErrorMessage, getErrorStatus, limitRecords, RateCounter, time, chunkOneCsvFile) and a Logger interface into @transcend-io/utils for use outside the CLI. The CLI now imports these from @transcend-io/utils instead of its own lib/helpers.

- 4812938: Testing: Updated shellcheck test to use a pinned shellcheck binary
- c072e20: Minor syntax changes
- cac80a5: Add publint
- 4b2e96f: Add v10 transcend.yml schema
- Updated dependencies [f08af44]
- Updated dependencies [3aefc21]
- Updated dependencies [c072e20]
- Updated dependencies [119a47a]
- Updated dependencies [d0d35a0]
- Updated dependencies [05716b8]
- Updated dependencies [1c0534e]
- Updated dependencies [40c8524]
- Updated dependencies [2493ea0]
- Updated dependencies [b737da6]
- Updated dependencies [415887f]
- Updated dependencies [7c3bd44]
- Updated dependencies [ec80f0b]
- Updated dependencies [ceb9be8]
- Updated dependencies [c467daf]
- Updated dependencies [6909387]
- Updated dependencies [2669fef]
- Updated dependencies [b066787]
- Updated dependencies [c467daf]
- Updated dependencies [eb65725]
- Updated dependencies [01fb917]
- Updated dependencies [cac80a5]
- Updated dependencies [1d5c5b3]
- Updated dependencies [d777dd4]
- Updated dependencies [7816fc0]
  - @transcend-io/privacy-types@5.0.1
  - @transcend-io/utils@0.1.0
  - @transcend-io/sdk@0.1.0

## 10.0.1

### Patch Changes

- eb10d45: Improve CLI compatibility with the current Node type definitions.
- Updated dependencies [20d052a]
  - @transcend-io/privacy-types@5.0.0

## 10.0.0

### Major Changes

- 617c7e3: Transcend's CLI has moved GitHub repositories (from `github.com/transcend-io/cli` to `github.com/transcend-io/tools`). While this does not include any functional changes, we are releasing this under a new major version, since build and release tooling have changed.

### Patch Changes

- 12338bf: Updated GitHub action example for `transcend inventory push` on CI
- ec73feb: Minor fixes to code examples

## 9.0.0

### Major Changes

- Switched to ESM-only distribution.

## 8.1.0

### Minor Changes

- Added a new CLI command to split CSVs into multiple chunks.

```sh
transcend admin chunk-csv --directory=$DIRECTORY_WITH_RAW_FILES --outputDir=$DIRECTORY_TO_UPLOAD --chunkSizeMB=5 --concurrency=10
```

## 8.0.0

### Major Changes

- Dropped Node <22 support. Make sure you are on at least Node 22 before calling CLI commands: `node --version; nvm install 22 && nvm use 22 && nvm alias default 22`

## 7.3.0

### Minor Changes

- Added `identifiers[*].isUniqueOnPreferenceStore` to `transcend.yml` for use in the inventory push and inventory pull commands.

## 7.2.0

### Minor Changes

- Writing processing activities to Transcend is now possible.

## 7.1.0

### Minor Changes

- Pulling processing activities from Transcend is now possible.

## 7.0.3

### Patch Changes

- Resolved an issue where `transcend consent upload-preferences` was incorrectly passing `consentUrl` (with default value `consent.transcend.io`) instead of `transcendUrl` (with default value `api.transcend.io`). The argument was renamed back to `transcendUrl`, reverting the change to the argument name introduced in 7.0.0.

## 7.0.2

### Patch Changes

- Resolved an issue where an invalid reference to a GraphQL mutation caused the CLI to fail.

## 7.0.0

### Major Changes

All commands have been re-mapped to new commands under the `transcend` namespace.

| Old Command                                           | New Command                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `tr-build-xdi-sync-endpoint`                          | `transcend consent build-xdi-sync-endpoint`                            |
| `tr-consent-manager-service-json-to-yml`              | `transcend inventory consent-manager-service-json-to-yml`              |
| `tr-consent-managers-to-business-entities`            | `transcend inventory consent-managers-to-business-entities`            |
| `tr-cron-mark-identifiers-completed`                  | `transcend request cron mark-identifiers-completed`                    |
| `tr-cron-pull-identifiers`                            | `transcend request cron pull-identifiers`                              |
| `tr-derive-data-silos-from-data-flows`                | `transcend inventory derive-data-silos-from-data-flows`                |
| `tr-derive-data-silos-from-data-flows-cross-instance` | `transcend inventory derive-data-silos-from-data-flows-cross-instance` |
| `tr-discover-silos`                                   | `transcend inventory discover-silos`                                   |
| `tr-generate-api-keys`                                | `transcend admin generate-api-keys`                                    |
| `tr-manual-enrichment-pull-identifiers`               | `transcend request preflight pull-identifiers`                         |
| `tr-manual-enrichment-push-identifiers`               | `transcend request preflight push-identifiers`                         |
| `tr-mark-request-data-silos-completed`                | `transcend request system mark-request-data-silos-completed`           |
| `tr-pull`                                             | `transcend inventory pull`                                             |
| `tr-pull-consent-metrics`                             | `transcend consent pull-consent-metrics`                               |
| `tr-pull-consent-preferences`                         | `transcend consent pull-consent-preferences`                           |
| `tr-pull-datapoints`                                  | `transcend inventory pull-datapoints`                                  |
| `tr-pull-pull-unstructured-discovery-files`           | `transcend inventory pull-unstructured-discovery-files`                |
| `tr-push`                                             | `transcend inventory push`                                             |
| `tr-request-approve`                                  | `transcend request approve`                                            |
| `tr-request-cancel`                                   | `transcend request cancel`                                             |
| `tr-request-download-files`                           | `transcend request download-files`                                     |
| `tr-request-enricher-restart`                         | `transcend request enricher-restart`                                   |
| `tr-request-export`                                   | `transcend request export`                                             |
| `tr-request-mark-silent`                              | `transcend request mark-silent`                                        |
| `tr-request-notify-additional-time`                   | `transcend request notify-additional-time`                             |
| `tr-request-reject-unverified-identifiers`            | `transcend request reject-unverified-identifiers`                      |
| `tr-request-restart`                                  | `transcend request restart`                                            |
| `tr-request-upload`                                   | `transcend request upload`                                             |
| `tr-retry-request-data-silos`                         | `transcend request system retry-request-data-silos`                    |
| `tr-scan-packages`                                    | `transcend inventory scan-packages`                                    |
| `tr-skip-preflight-jobs`                              | `transcend request skip-preflight-jobs`                                |
| `tr-skip-request-data-silos`                          | `transcend request system skip-request-data-silos`                     |
| `tr-sync-ot`                                          | `transcend migration sync-ot`                                          |
| `tr-update-consent-manager`                           | `transcend consent update-consent-manager`                             |
| `tr-upload-consent-preferences`                       | `transcend consent upload-consent-preferences`                         |
| `tr-upload-cookies-from-csv`                          | `transcend consent upload-cookies-from-csv`                            |
| `tr-upload-data-flows-from-csv`                       | `transcend consent upload-data-flows-from-csv`                         |
| `tr-upload-preferences`                               | `transcend consent upload-preferences`                                 |

- For the `tr-upload-consent-preferences` ~~and `tr-upload-preferences`~~ commands ([the change to `tr-upload-preferences` was reverted in 7.0.3](#703)), the `transcendUrl` argument was renamed to `consentUrl`. The default value is the same, `https://consent.transcend.io` for EU hosting, and you can use `https://consent.us.transcend.io` for US hosting.

### Minor Changes

- All commands have a `--help` flag to print help information. For example:

  ```console
  $ transcend consent update-consent-manager --help

  USAGE
    transcend consent update-consent-manager (--auth value) (--bundleTypes PRODUCTION|TEST) [--deploy] [--transcendUrl value]
    transcend consent update-consent-manager --help

  This command allows for updating Consent Manager to latest version. The consent manager bundle can also be deployed using this command.

  FLAGS
       --auth           The Transcend API key. Requires scopes: "Manage Consent Manager Developer Settings"
       --bundleTypes    The bundle types to deploy. Defaults to PRODUCTION,TEST.                            [PRODUCTION|TEST, separator = ,]
      [--deploy]        When true, deploy the Consent Manager after updating the version                    [default = false]
      [--transcendUrl]  URL of the Transcend backend. Use https://api.us.transcend.io for US hosting        [default = https://api.transcend.io]
    -h  --help          Print help information and exit
  ```

- Boolean arguments no longer need to have `=true` or `=false` strings explicitly passed to them. For example, rather than pass `--deploy=true`, you can now pass `--deploy` alone. Passing `--deploy=true` or `--deploy=false` is still supported, as well as other boolean values described [here](https://github.com/bloomberg/stricli/blob/58a10349b427d9e5e7d75bf1767898d095e8544c/packages/core/src/parameter/parser/boolean.ts#L21-L26). For booleans which default to true, you can also prefix `no` to the argument name. For example, `--noDeploy` is equivalent to `--deploy=false`.
- List arguments can either be passed as a comma-separated string or as several arguments. For example, `--bundleTypes=PRODUCTION,TEST` is equivalent to `--bundleTypes PRODUCTION --bundleTypes TEST`.

## 6.0.0

### Major Changes

- Updated the shape of `transcend.yml` for `consent-manager.experiences[0].purposes[*]`.

Before:

```yml
consent-manager:
  ...
  experiences:
    - name: Unknown
      ...
      purposes:
        - name: Functional
        - name: SaleOfInfo
      optedOutPurposes:
         - name: SaleOfInfo
```

After:

```yml
consent-manager:
  ...
  experiences:
    - name: Unknown
      ...
      purposes:
        - trackingType: Functional
        - trackingType: SaleOfInfo
      optedOutPurposes:
        - trackingType: SaleOfInfo
```

- Updated the shape of `transcend.yml` so `consent-manager.partitions` moved to the top-level `partitions`.

Before:

```yml
consent-manager:
  ...
  partitions:
    - ...
```

After:

```yml
partitions: ...
```

## 5.0.0

### Major Changes

- Added support for encrypted identifiers to `tr-manual-enricher-pull-identifiers`. Because this command now uses Sombra to decrypt request identifiers, you may need to provide `--sombraAuth`. It is required when using self-hosted Sombra, but not for multi-tenant.

  ```txt
  Before:
    yarn tr-manual-enricher-pull-identifiers --auth=$TRANSCEND_API_KEY  \
      --actions=ERASURE \
      --file=/Users/michaelfarrell/Desktop/test.csv

  Now:
    yarn tr-manual-enricher-pull-identifiers --auth=$TRANSCEND_API_KEY  \
      --sombraAuth=$SOMBRA_INTERNAL_KEY \
      --actions=ERASURE \
      --file=/Users/michaelfarrell/Desktop/test.csv
  ```

- Added support for encrypted identifiers to `tr-request-export`. Because this command now uses Sombra to decrypt request identifiers, you may need to provide `--sombraAuth`. It is required when using self-hosted Sombra, but not for multi-tenant.

  ```txt
  Before:
    yarn tr-request-export --auth=$TRANSCEND_API_KEY  \
      --actions=ERASURE \
      --file=/Users/michaelfarrell/Desktop/test.csv

  Now:
    yarn tr-request-export --auth=$TRANSCEND_API_KEY  \
      --sombraAuth=$SOMBRA_INTERNAL_KEY \
      --actions=ERASURE \
      --file=/Users/michaelfarrell/Desktop/test.csv
  ```

- Added support for encrypted identifiers to `tr-request-restart`, used only when `--copyIdentifiers` is specified. Because this command now uses Sombra to decrypt request identifiers, you may need to provide `--sombraAuth`. It is required only when using `--copyIdentifiers` and self-hosted Sombra, and is otherwise not required.

  ```txt
  Before:
    yarn tr-request-restart --auth=$TRANSCEND_API_KEY \
      --statuses=COMPILING,APPROVING --actions=ERASURE --copyIdentifiers=true

  Now:
    yarn tr-request-restart --auth=$TRANSCEND_API_KEY \
      --sombraAuth=$SOMBRA_INTERNAL_KEY \
      --statuses=COMPILING,APPROVING --actions=ERASURE --copyIdentifiers=true
  ```
