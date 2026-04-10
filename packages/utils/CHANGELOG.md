# @transcend-io/utils

## 0.1.1

### Patch Changes

- 8984fb5: Migrate `@transcend-io/type-utils` into the tools monorepo as a first-party workspace package. The package now uses the monorepo's standard build, test, and export conventions while preserving the existing utility and `io-ts` helper surface for internal consumers.

  Update the dependent workspace packages to consume the monorepo-managed `@transcend-io/type-utils` package instead of the previously external dependency reference.

- Updated dependencies [8984fb5]
  - @transcend-io/type-utils@3.0.0

## 0.1.0

### Minor Changes

- 3aefc21: Extract shared utilities from CLI into @transcend-io/utils

  Move generic helpers (splitInHalf, retrySamePromise, sleepPromise, extractErrorMessage, getErrorStatus, limitRecords, RateCounter, time, chunkOneCsvFile) and a Logger interface into @transcend-io/utils for use outside the CLI. The CLI now imports these from @transcend-io/utils instead of its own lib/helpers.

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

- 1d5c5b3: Rename @transcend-io/core to @transcend-io/sdk, make utils and sdk public, move GraphQL/REST API foundation and preference management fetchers into SDK
  - Rename packages/core to packages/sdk (@transcend-io/sdk)
  - Make @transcend-io/utils and @transcend-io/sdk publishable (remove private flag)
  - Add api/ module to SDK: buildTranscendGraphQLClient, makeGraphQLRequest, createSombraGotInstance with Logger DI
  - Add preference-management/ module to SDK: fetchAllPurposes, fetchAllPreferenceTopics, fetchAllPurposesAndPreferences, fetchAllIdentifiers, createPreferenceAccessTokens
  - Move bluebird map/mapSeries wrapper from CLI to @transcend-io/utils

### Patch Changes

- c072e20: Minor syntax changes
- cac80a5: Add publint
