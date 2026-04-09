# Contributing

## What This Repo Is

This repository is a `pnpm` + Turborepo monorepo for public `@transcend-io/*` TypeScript `packages/`.

The root package is private. Publishable packages live in `packages/`.

## Setup

[Install `mise`](https://mise.jdx.dev/getting-started.html), then run:

```bash
mise trust mise.toml
mise install
mise run bootstrap
```

`mise.toml` pins the Node version for local development, devcontainers, and CI. `package.json`
pins the exact `pnpm` version.

### Linter and Formatter

The repo uses `oxc` for linting and `oxfmt` for formatting.

- You should install the [`oxc.oxc-vscode`](https://open-vsx.org/extension/oxc/oxc-vscode) extension to get the best experience.
- You should disable ESLint and Prettier extensions, if you have them installed. You can disable them for this repository only by right-clicking the extension and selecting "Disable (Workspace)".

## Daily Workflow

1. Run `mise run bootstrap` after cloning and whenever dependencies change.
2. Make your change in the relevant package.
3. Add a changeset when your change touches package code under `packages/`.
4. Merge your feature PR into `main`.
5. CI will automatically open a release PR.
6. If you wish to release immediately, merge the release PR to publish to npm.

## Common Commands

- `pnpm build`: build workspace packages with `tsdown`
- `pnpm test`: run package tests with Vitest
- `pnpm quality`: run repo-wide verification checks and typecheck
- `pnpm quality:fix`: auto-fix formatting and lint issues where possible, then run the remaining quality checks
- `pnpm changeset`: create a changeset file

Additional checks:

- `pnpm typecheck`: run TypeScript checks across workspace packages
- `pnpm lint`: run `oxlint` across the repo
- `pnpm lint:fix`: run `oxlint --fix` across the repo
- `pnpm format`: format the repo with `oxfmt`
- `pnpm format:check`: verify formatting with `oxfmt --check`
- `pnpm check:changeset`: validate changeset coverage for publishable package changes
- `pnpm check:packages`: validate shared package metadata and layout conventions
- `pnpm check:exports`: validate published package shape with `attw`
- `pnpm check:publint`: validate published package compatibility and packaging metadata
- `pnpm check:deps`: enforce dependency version policy

`pnpm quality` intentionally excludes `pnpm check:changeset`, since that check compares the current branch to its base and is mainly useful in pull request workflows.

Release and maintenance:

- `pnpm changeset:version`: apply pending changesets to versions and changelogs
- `pnpm changeset:version:release`: apply pending changesets and reformat the repo
- `pnpm release`: build and publish packages

### Run Commands in a Single Package

Use `pnpm --filter` or (`pnpm -F` for short) when you only need to work on one package:

```bash
pnpm -F cli start
```

See [pnpm Filtering](https://pnpm.io/filtering) for more examples.

## Releases and Versioning

> [!Note]
>
> 1. **You do _NOT_ need to manually version packages in your PRs.** Instead, you need to create a changeset file via `pnpm changeset`.
> 2. **Your feature PR does _NOT_ automatically publish to npm.** Instead, CI opens a release PR after your feature PR is merged.

### Release Workflow

Stable releases are driven by Changesets and the [Release workflow](.github/workflows/release.yml):

1. Developers merge feature PRs with changesets into `main`.
2. The `Release` workflow automatically opens a release PR, titled "Version Packages".

   _Or, if there's already an open release PR, then that PR will be updated instead._

   In a release PR:
   - Each changeset file (at `.changeset/*.md`) is turned into a change entry in each package's `CHANGELOG.md` file, and the changeset file is deleted.
   - Package versions are bumped accordingly.
   - [Here's an example of a release PR](https://github.com/transcend-io/tools/pull/24).

3. When the release PR is merged, the `Release` workflow publishes the packages to npm.

Thus, after you merge a feature PR, you can either:

1. Merge the subsequent release PR to publish to npm if you want it released immediately, or
2. Wait a few feature PRs build up, before merging a release PR and publishing to npm (this also allows you to split up your changes into multiple PRs without releasing).

### Changesets

[Changesets](https://github.com/changesets/changesets) record release intent.

Create one with:

```bash
pnpm changeset
```

Add a changeset when changes to a package under `packages/` would require a new version to be published to npm.

[`scripts/check-changeset.ts`](scripts/check-changeset.ts) enforces this on pull requests. It only requires coverage for changed publishable packages, and it ignores:

- private packages (i.e. packages with `"private": true` in their `package.json`)
- package `README.md` changes
- test files
- generated `dist/` output
- `node_modules/` and `.turbo/`
- _See [`scripts/check-changeset.ts`](scripts/check-changeset.ts) for the full list of ignored files._

If a PR changes a publishable package, each changed publishable package must be mentioned in at least one changeset frontmatter block. Otherwise, CI fails.

### Preview Releases

Pull requests also get preview packages via `pkg.pr.new`, which you'll see as an automated bot comment in your PR. Use those when another repo or environment needs to test package changes before a stable release. Obviously, you should never use these preview releases in production.

### Trusted Publishing

This repo is set up for npm trusted publishing via GitHub OIDC. The workflow has `id-token: write`,
and normal publishing should not require a long-lived `NPM_TOKEN`. Each published package still has
to be configured in npm to trust this repository and workflow.

If npm trusted publishing is not configured for a package, the release workflow will build and
version correctly but fail at publish time.

### Manual Releases

`release.yml` also supports `workflow_dispatch`. Use that for reruns or recovery, not as the normal
release path.

## Turborepo

This repo uses [Turborepo](https://turborepo.dev/docs), which caches package.json script outputs. Try running `pnpm build` twice to see the cache in action.

### Remote Cache

> [!Note]
> Remote caching is not yet configured.

CI and release workflows can use Turbo remote caching when `secrets.TURBO_TOKEN` and
`vars.TURBO_TEAM` are configured. Local development does not require remote cache.

## Git Hooks

After a normal install from the repo root, Husky configures local Git hooks automatically.

- `pre-commit`: runs `pnpm quality:fix` and aborts if it updates tracked files
- `pre-push`: runs `pnpm test`

These hooks are local guardrails. CI still runs the canonical repo checks on pull requests and
releases.

If you install dependencies with scripts disabled, rerun `pnpm run prepare` from the repo root
before committing.

## Dependency Management

Shared dependency versions live in `pnpm-workspace.yaml` catalogs.

Guidelines:

- prefer `catalog:` for shared toolchain dependencies
- prefer `workspace:*` for dependencies between local packages
- keep additions consistent with the single-version policy enforced by `syncpack`

## Pull Requests

### Pull Request GitHub Actions Workflows

On pull requests, GitHub Actions runs:

- **`CI`**:
  - `CI / global` job: runs all the standard commands across each package such as `build` and `test` commands.
  - `CI / <package-name>` jobs: some packages may have their own jobs to add unique checks, such as the `CI / cli`, which ensures that generated CLI files are up to date.
- **`Preview Release`** see [Preview Releases](#preview-releases) for more.

### Fresh Approvals Are Required

New, reviewable commits pushed will dismiss previous pull request review approvals. As a public repository, we want to ensure that all changes are reviewed and approved by at least one team member.

### Merge Queue

This repo uses the GitHub [Merge Queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue) feature to automatically merge pull requests when CI passes.

## Add A New Package

Transcend Team:

- See our [HOWTO: Migrate a repo to transcend-io/tools](https://www.notion.so/transcend/HOWTO-Migrate-a-repo-to-transcend-io-tools-33006522d0d780719751f9fbdf6b44cd).
- If this is a net-new npm package, it needs to first be created [here](https://www.npmjs.com/settings/transcend-io/teams/team/developers/access?page=1&perPage=10), and it needs trusted publishing set up (see the HOWTO guide above for more on that). Once that is done, it should publish successfully the next time a release PR merges with a changeset for that package.

New packages should match the shape used in `packages/sdk` and `packages/utils`.

For a new package:

1. Create `packages/<name>/package.json`.
2. Add `tsconfig.json`, `tsdown.config.ts`, and `src/index.ts`.
3. Add tests when the package has behavior worth validating.
4. Add the package to the root `tsconfig.json` references list.
5. Use `workspace:*` for dependencies on other local packages.
6. Use `catalog:` for shared tool dependencies.

Current package conventions:

- ESM-only packages with `"type": "module"`
- published entrypoints served from `dist/`
- `@transcend-io/source` export condition for live source resolution inside the monorepo
- `build`, `test`, `typecheck`, and `check:exports` scripts in each package
- publishable packages also provide a `check:publint` script
- `pnpm check:packages` enforces shared package metadata, required package files, and root `tsconfig.json` references
- publishable packages include `homepage`, `repository`, and `author` metadata
- released publishable packages keep a `CHANGELOG.md`

## MCP Servers

MCP (Model Context Protocol) server packages live under `packages/mcp/`. They let AI agents interact with the Transcend platform. See the root [`README.md`](./README.md) for a full list of packages and their purpose.

### Layout

```
packages/mcp/
  mcp-server-core/       # Shared infrastructure (GraphQL base, REST client, validation, types)
  mcp-server-admin/      # Domain: org, users, API keys
  mcp-server-assessments/
  mcp-server-consent/
  mcp-server-discovery/
  mcp-server-dsr/
  mcp-server-inventory/
  mcp-server-preferences/
  mcp-server-workflows/
  mcp-server/            # Unified server that re-exports all domain tools
```

Each domain package provides a standalone CLI and can be installed independently. The unified `mcp-server` package composes all domains via `ToolRegistry`.

### Working on a Single MCP Package

Use `pnpm --filter` the same way as any other package. For `build`, prefer a Turbo filter with a trailing `...` so `mcp-server-core` and other dependencies are built when needed:

```bash
pnpm exec turbo run build --filter="@transcend-io/mcp-server-consent..."
pnpm -F @transcend-io/mcp-server-consent test
pnpm -F @transcend-io/mcp-server-consent typecheck
```

### Environment Variables

All MCP servers require:

- `TRANSCEND_API_KEY` — your Transcend API key

Optional overrides:

- `TRANSCEND_API_URL` — Sombra REST API base URL (default: `https://multi-tenant.sombra.transcend.io`)
- `TRANSCEND_GRAPHQL_URL` — GraphQL API base URL (default: `https://api.transcend.io`)

### Adding a Tool

1. Create a new file under the domain's `src/tools/` directory (e.g. `src/tools/consent_new_tool.ts`).
2. Export a `create*Tool(clients: ToolClients): ToolDefinition` factory function following the existing pattern.
3. Register it in the domain's `src/tools/index.ts` by importing and adding it to the returned array.
4. If the tool needs new input validation, add a Zod schema to `src/schemas.ts`.
5. If the tool calls a new API endpoint, extend the domain's GraphQL mixin (`src/graphql.ts`) or the shared REST client in `mcp-server-core`.
6. Add or extend tests in the domain package's `tests/` directory.
7. The unified `mcp-server` package picks up the new tool automatically through its `ToolRegistry`.

### Changesets

MCP packages are publishable. Run `pnpm changeset` when your change modifies package code under `packages/mcp/`, just like any other publishable package.
