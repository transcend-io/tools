# @transcend-io/utils

## 0.1.3

### Patch Changes

- 18b4321: Retry transient gateway errors on Sombra REST reads so large `transcend request export` and `transcend cron pull-identifiers` runs ride through occasional 502 / 503 / 504 / 429 / network resets from the reverse tunnel instead of aborting a chunk.
  - Add a generalised `withTransientRetry` (and `isTransientError`) helper in `@transcend-io/sdk` under `api/`. Exponential backoff with jitter, retries on known-transient message substrings (`ECONNRESET`, `ETIMEDOUT`, `bad gateway`, `gateway timeout`, etc.) _and_ known-transient HTTP status codes (408, 425, 429, 500, 502, 503, 504) so `got` HTTPErrors are caught even when their message is generic.
  - `fetchAllRequestIdentifiers` (used by `transcend request export`) now wraps `POST /v1/request-identifiers` in `withTransientRetry` with `maxAttempts: 6` and `baseDelayMs: 500`. Fixes WAL-9783.
  - `pullCronPageOfIdentifiers` (used by `transcend cron pull-identifiers`) applies the same retry wrapper around its Sombra `GET` for the same reason.
  - **Breaking:** the preference-scoped aliases `withPreferenceRetry` and `RETRY_PREFERENCE_MSGS` are removed. Callers should import `withTransientRetry` / `RETRY_TRANSIENT_MSGS` from `@transcend-io/sdk` directly (the underlying implementation is unchanged).
  - `extractErrorMessage` now summarises HTML gateway bodies (`<html>...502 Bad Gateway...</html>`) as `HTTP 502 Bad Gateway` when a status code is available, and caps raw non-JSON bodies at ~200 characters so failures surface cleanly in CLI output instead of dumping the whole HTML page.

## 0.1.2

### Patch Changes

- Updated dependencies [f252484]
  - @transcend-io/type-utils@3.0.1

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
