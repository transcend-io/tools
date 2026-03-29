# @transcend-io/cli

## 10.1.0

### Minor Changes

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

- 3aefc21: Extract shared utilities from CLI into @transcend-io/utils

  Move generic helpers (splitInHalf, retrySamePromise, sleepPromise, extractErrorMessage, getErrorStatus, limitRecords, RateCounter, time, chunkOneCsvFile) and a Logger interface into @transcend-io/utils for use outside the CLI. The CLI now imports these from @transcend-io/utils instead of its own lib/helpers.

- 4812938: Testing: Updated shellcheck test to use a pinned shellcheck binary
- c072e20: Minor syntax changes
- cac80a5: Add publint
- Updated dependencies [3aefc21]
- Updated dependencies [c072e20]
- Updated dependencies [2669fef]
- Updated dependencies [cac80a5]
- Updated dependencies [1d5c5b3]
  - @transcend-io/utils@0.1.0
  - @transcend-io/sdk@0.1.0
  - @transcend-io/privacy-types@5.0.1

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
