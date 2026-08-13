# Transcend Custom Functions Sync Action

A composite GitHub Action that keeps your [Transcend custom functions](https://app.transcend.io/infrastructure/custom-functions) in sync with source code in your own repository. On every push, it creates any missing custom functions and pushes a new code revision to any function whose code or execution context changed — unchanged functions are skipped. Functions with test payloads are test-run on your Sombra gateway before being pushed — DSR functions can cover both their entry points — and failures fail the workflow with the function's logs.

It wraps the [`transcend custom-functions push`](https://github.com/transcend-io/tools/tree/main/packages/cli#transcend-custom-functions-push) command from `@transcend-io/cli`.

## Prerequisites

1. A Transcend API key with the **Manage Data Map** scope, stored as a repository secret (e.g. `TRANSCEND_API_KEY`).
2. Your Sombra internal key, stored as a repository secret (e.g. `SOMBRA_INTERNAL_KEY`). It is used for all functions unless a manifest entry points at its own key via `sombra-auth-env`.
3. A manifest file in your repository (default: `./transcend-functions.yml`) mapping custom function names to TypeScript source files:

```yaml
# transcend-functions.yml
functions:
  - name: Update Preferences
    code: ./functions/update-preferences.ts
    description: Sync preference changes from an external system into the Preference Store
    test-payload: ./test-payloads/update-preferences.json
    timeout-ms: 30000
    env:
      TRANSCEND_API_KEY: <<parameters.transcendApiKey>>
      TRANSCEND_PARTITION: <<parameters.transcendPartition>>
  - name: DSR Lookup
    code: ./functions/dsr-lookup.ts
    type: DSR
    # Omit data-silo-id for a new DSR function and its integration (data
    # silo) is created automatically on a passing test; `update-manifest`
    # writes the assigned ID back here.
    data-silo-id: 5a4b0f9c-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    # DSR functions have two entry points — test both on every push
    test-payloads:
      - payload: ./test-payloads/dsr-lookup.json
        payload-type: DATA_POINT
      - payload: ./test-payloads/dsr-lookup-enricher.json
        payload-type: REQUEST_ENRICHER
    allowed-hosts:
      - warehouse.internal.example.com
    env:
      WAREHOUSE_API_KEY: <<parameters.warehouseApiKey>>
```

4. Optionally, a `test-payloads/` folder with a JSON payload per function you want tested before promotion (see [Test-before-promote](#test-before-promote)).

See the [CLI documentation](https://github.com/transcend-io/tools/tree/main/packages/cli#transcend-custom-functions-push) for the full manifest schema, and [examples/](./examples/) for the complete function sources — a GENERAL function syncing preference changes into the Preference Store, and a DSR function fulfilling access/erasure requests (with an `enricher` export), adapted from [these use cases](https://docs.transcend.io/docs/articles/rules-automation/webhook-user-guide#usecases).

### How entries are matched to existing functions

Each manifest entry is matched **by `id` first** when one is set — the ID is the sync key, so the function can be freely renamed, and a nonexistent ID fails the push rather than creating a duplicate. Entries without an `id` are matched by exact `name`: one match updates it, zero matches creates it, and multiple functions sharing the name fail the push with an error listing the candidate IDs to pin. Since custom function names are not guaranteed unique, prefer pinning IDs: run the CLI locally once with `--updateManifest` (or enable the `update-manifest` input plus an auto-commit step) and the assigned IDs are written back into the manifest.

### New DSR functions: the integration is created automatically

A new DSR entry that omits `data-silo-id` gets its DSR integration created as part of the push: a `customFunction`-catalog data silo is created on the entry's Sombra gateway (or the organization's primary), the signed code is test-run against it, and on a passing test the function is created and linked. A failing test **rolls the silo back** (deletes it) and fails the workflow. With `update-manifest` enabled, both the function `id` and the `data-silo-id` are written back into the manifest — pair it with an auto-commit step to persist them. DSR test payloads get `extras.dataSilo` injected automatically from the entry's resolved silo, so payload files never hardcode silo IDs.

## Usage

```yaml
name: Sync Transcend Custom Functions

on:
  push:
    branches: [main]
    paths:
      - 'transcend-functions.yml'
      - 'functions/**'
  pull_request:
    paths:
      - 'transcend-functions.yml'
      - 'functions/**'

jobs:
  sync-custom-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Preview changes on pull requests
      - name: Dry run
        if: github.event_name == 'pull_request'
        uses: transcend-io/tools/github-action@main
        with:
          api-key: ${{ secrets.TRANSCEND_API_KEY }}
          sombra-auth: ${{ secrets.SOMBRA_INTERNAL_KEY }}
          dry-run: 'true'

      # Push and promote on merge to main
      - name: Push custom functions
        if: github.event_name == 'push'
        uses: transcend-io/tools/github-action@main
        with:
          api-key: ${{ secrets.TRANSCEND_API_KEY }}
          sombra-auth: ${{ secrets.SOMBRA_INTERNAL_KEY }}
          variables: transcendApiKey:${{ secrets.TRANSCEND_PREFERENCES_API_KEY }},transcendPartition:${{ secrets.TRANSCEND_PARTITION }},warehouseApiKey:${{ secrets.WAREHOUSE_API_KEY }}
```

## Inputs

| Input             | Required | Default                     | Description                                                                                                                    |
| ----------------- | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `api-key`         | Yes      | —                           | Transcend API key with the **Manage Data Map** scope.                                                                          |
| `sombra-auth`     | Yes      | —                           | Sombra internal key. Used for all functions unless a manifest entry provides its own key via `sombra-auth-env`.                |
| `transcend-url`   | No       | `https://api.transcend.io`  | Transcend backend URL.                                                                                                         |
| `file`            | No       | `./transcend-functions.yml` | Path to the manifest file.                                                                                                     |
| `variables`       | No       | `''`                        | Comma-separated `key:value` pairs templated into `<<parameters.key>>` placeholders in the manifest. Use for secret env values. |
| `dry-run`         | No       | `false`                     | Report what would change without pushing anything.                                                                             |
| `promote`         | No       | `true`                      | Promote new revisions to active. Set to `false` to leave revisions as drafts for review in the dashboard.                      |
| `force`           | No       | `false`                     | Push a new revision even when no changes are detected (e.g. when only env values rotated).                                     |
| `skip-tests`      | No       | `false`                     | Skip test runs entirely, pushing functions without executing their manifest test-payload files.                                |
| `update-manifest` | No       | `false`                     | Write assigned custom function IDs back into the manifest after pushing. Pair with an auto-commit step to persist them.        |
| `sombra-id`       | No       | primary Sombra              | Default Sombra gateway to sign code against, for entries that don't set `sombra-id` in the manifest.                           |
| `cli-version`     | No       | `latest`                    | Version of `@transcend-io/cli` to use. Pin this for reproducible builds.                                                       |

## Multiple Sombra gateways

Functions in one manifest may belong to different Sombra gateways — set `sombra-id` per manifest entry and each function is signed against its own gateway. The `sombra-auth` input is the default internal key for every function; when gateways use different internal keys, set `sombra-auth-env` on the manifest entry to the name of an environment variable holding that gateway's key, and export the variable on the action step (composite action steps inherit the step's `env:`):

```yaml
- name: Push custom functions
  uses: transcend-io/tools/github-action@main
  with:
    api-key: ${{ secrets.TRANSCEND_API_KEY }}
    sombra-auth: ${{ secrets.SOMBRA_US_INTERNAL_KEY }} # default key
  env:
    SOMBRA_EU_INTERNAL_KEY: ${{ secrets.SOMBRA_EU_INTERNAL_KEY }} # for entries with sombra-auth-env
```

```yaml
# transcend-functions.yml
functions:
  - name: US Function
    code: ./functions/us.ts
  - name: EU Function
    code: ./functions/eu.ts
    sombra-id: 8c0b1f2a-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    sombra-auth-env: SOMBRA_EU_INTERNAL_KEY
```

## Test-before-promote

Manifest entries with test payloads are tested before anything is pushed. Associate each function with one or more payload JSON files — conventionally in a `test-payloads/` folder next to the manifest (see [examples/](./examples/)):

```
transcend-functions.yml
functions/
  update-preferences.ts
  dsr-lookup.ts
test-payloads/
  update-preferences.json
  dsr-lookup.json
  dsr-lookup-enricher.json
```

On a push, each changed or new function is signed against your Sombra gateway, then the signed code is executed on that gateway with every payload as a test run (nothing is persisted). Functions where all payloads pass (no error, exit code ≤ 0) are pushed and promoted; functions with any failing payload are **rejected** — every failing payload's reason and execution logs are printed to the workflow log (all payloads run, so one push reports every failing case), nothing is pushed for that function, and the job fails.

DSR functions have two entry points, so list one payload per export under `test-payloads`: `payload-type: DATA_POINT` (default) invokes the default export, `payload-type: REQUEST_ENRICHER` invokes the `enricher` export. A warning is printed when a DSR entry only covers one export. Single-payload entries can use the `test-payload` (+ `test-payload-type`) shorthand instead. DSR payloads get `extras.dataSilo` injected automatically from the entry's data silo (including one created during the same push).

DSR test payloads must match the same [webhook notification shape](https://docs.transcend.io/docs/articles/rules-automation/webhook-user-guide) Transcend sends to real webhook integrations — top-level `type`, `isTest`, and `dataSubject`, plus `extras.request` / `extras.organization` and the export-specific fields (`extras.profile` for `DATA_POINT`, `extras.enricher` / `extras.identifier` / `extras.requestEnricherId` for `REQUEST_ENRICHER`). Start from [examples/test-payloads/dsr-lookup.json](./examples/test-payloads/dsr-lookup.json) and [examples/test-payloads/dsr-lookup-enricher.json](./examples/test-payloads/dsr-lookup-enricher.json); placeholder UUIDs are fine everywhere except `extras.dataSilo`, which is injected for you. GENERAL (Maestro) payloads are free-form JSON.

With the [Usage](#usage) workflow above, the full flow is:

- **Pull requests** run with `dry-run: 'true'` — changes are reported, nothing is signed, tested, or pushed.
- **Pushes to main** sign → test → push + promote automatically. A failing test fails the workflow with the function's logs.
- Entries without test payloads push as before, with a warning in the log.
- Set `skip-tests: 'true'` to bypass testing entirely.

Test runs require backend support for pre-signed code JWTs on the `runCustomFunction` mutation; on older backends the push fails with an upgrade hint — use `skip-tests` to bypass.

## How it works

1. The action signs each function's code and context directly against your Sombra gateway's customer ingress over TLS, authenticated by your API key and Sombra internal key. Code and env values never reach Transcend's backend in plaintext — only the signed JWTs are saved via the API.
2. New DSR functions without a `data-silo-id` get their DSR integration (data silo) created automatically; a failing test rolls it back.
3. Functions with test payloads are test-run on your Sombra gateway with the freshly signed code (every payload must pass — DSR functions can cover both their default and enricher exports); failures are rejected and fail the job.
4. Changed functions get a new draft revision which is promoted to active (unless `promote: 'false'`).
5. The job fails if any function fails to sync or fails its test, so a red check means Transcend is out of sync with your repository.
