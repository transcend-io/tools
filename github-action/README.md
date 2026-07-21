# Transcend Custom Functions Sync Action

A composite GitHub Action that keeps your [Transcend custom functions](https://app.transcend.io/infrastructure/custom-functions) in sync with source code in your own repository. On every push, it creates any missing custom functions and pushes a new code revision to any function whose code or execution context changed — unchanged functions are skipped.

It wraps the [`transcend custom-functions push`](https://github.com/transcend-io/tools/tree/main/packages/cli#transcend-custom-functions-push) command from `@transcend-io/cli`.

## Prerequisites

1. A Transcend API key with the **Manage Data Map** scope, stored as a repository secret (e.g. `TRANSCEND_API_KEY`).
2. A manifest file in your repository (default: `./transcend-functions.yml`) mapping custom function names to TypeScript source files:

```yaml
# transcend-functions.yml
functions:
  - name: Score Lead
    code: ./functions/score-lead.ts
    description: Scores an inbound lead against the CRM
    allowed-hosts:
      - api.example.com
    timeout-ms: 30000
    env:
      CRM_API_KEY: <<parameters.crmApiKey>>
  - name: DSR Lookup
    code: ./functions/dsr-lookup.ts
    type: DSR
    data-silo-id: 5a4b0f9c-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

See the [CLI documentation](https://github.com/transcend-io/tools/tree/main/packages/cli#transcend-custom-functions-push) for the full manifest schema.

### How entries are matched to existing functions

Each manifest entry is matched **by `id` first** when one is set — the ID is the sync key, so the function can be freely renamed, and a nonexistent ID fails the push rather than creating a duplicate. Entries without an `id` are matched by exact `name`: one match updates it, zero matches creates it, and multiple functions sharing the name fail the push with an error listing the candidate IDs to pin. Since custom function names are not guaranteed unique, prefer pinning IDs: run the CLI locally once with `--updateManifest` (or enable the `update-manifest` input plus an auto-commit step) and the assigned IDs are written back into the manifest.

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
          dry-run: 'true'

      # Push and promote on merge to main
      - name: Push custom functions
        if: github.event_name == 'push'
        uses: transcend-io/tools/github-action@main
        with:
          api-key: ${{ secrets.TRANSCEND_API_KEY }}
          variables: crmApiKey:${{ secrets.CRM_API_KEY }}
```

## Inputs

| Input             | Required | Default                     | Description                                                                                                                    |
| ----------------- | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `api-key`         | Yes      | —                           | Transcend API key with the **Manage Data Map** scope.                                                                          |
| `sombra-auth`     | No       | —                           | Sombra internal key, needed for additional authentication when self-hosting Sombra.                                            |
| `transcend-url`   | No       | `https://api.transcend.io`  | Transcend backend URL. Use `https://api.us.transcend.io` for US hosting.                                                       |
| `file`            | No       | `./transcend-functions.yml` | Path to the manifest file.                                                                                                     |
| `variables`       | No       | `''`                        | Comma-separated `key:value` pairs templated into `<<parameters.key>>` placeholders in the manifest. Use for secret env values. |
| `dry-run`         | No       | `false`                     | Report what would change without pushing anything.                                                                             |
| `promote`         | No       | `true`                      | Promote new revisions to active. Set to `false` to leave revisions as drafts for review in the dashboard.                      |
| `force`           | No       | `false`                     | Push a new revision even when no changes are detected (e.g. when only env values rotated).                                     |
| `update-manifest` | No       | `false`                     | Write assigned custom function IDs back into the manifest after pushing. Pair with an auto-commit step to persist them.        |
| `sombra-id`       | No       | primary Sombra              | Default Sombra gateway to sign code against, for entries that don't set `sombra-id` in the manifest.                           |
| `cli-version`     | No       | `latest`                    | Version of `@transcend-io/cli` to use. Pin this for reproducible builds.                                                       |

## Multiple Sombra gateways

Functions in one manifest may belong to different Sombra gateways — set `sombra-id` per manifest entry and each function is signed against its own gateway. When self-hosted gateways use different internal keys, `sombra-auth` alone is not enough: set `sombra-auth-env` on the manifest entry to the name of an environment variable holding that gateway's key, and export the variable on the action step (composite action steps inherit the step's `env:`):

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

## How it works

1. The action signs each function's code and context directly against your Sombra gateway's customer ingress over TLS, authenticated by your API key (plus the Sombra internal key when self-hosting). Code and env values never reach Transcend's backend in plaintext — only the signed JWTs are saved via the API.
2. Changed functions get a new draft revision which is promoted to active (unless `promote: 'false'`).
3. The job fails if any function fails to sync, so a red check means Transcend is out of sync with your repository.
