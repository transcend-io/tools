# Contributing

## What This Repo Is

This repository is a `pnpm` + Turborepo monorepo for public `@transcend-io/*` TypeScript `packages/`.

The root package is private. Publishable packages live in `packages/`. The `core` and `utils`
packages are examples meant to demonstrate the toolchain. They are set to `private: true` in their `package.json`s so they are not published to npm.

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
3. While iterating, run targeted commands with `pnpm --filter`.
4. Before opening a PR, run the repo-level checks affected by your change.
5. Add a changeset when your change touches package code under `packages/`.

## Common Commands

Run these from the repo root:

- `pnpm build`: build workspace packages with `tsdown`
- `pnpm test`: run package tests with Vitest
- `pnpm changeset`: create a changeset file
- `pnpm quality`: run formatting, lint, and dependency-policy checks
- `pnpm quality:fix`: auto-fix formatting and lint issues where possible
- `pnpm lint`: run `oxlint` across the repo
- `pnpm lint:fix`: run `oxlint --fix` across the repo
- `pnpm format`: format the repo with `oxfmt`
- `pnpm format:check`: verify formatting with `oxfmt --check`
- `pnpm syncpack:lint`: enforce dependency version policy
- `pnpm typecheck`: run TypeScript checks across workspace packages
- `pnpm check-exports`: validate published package shape with `attw`

### Run Commands in a Single Package

Use `pnpm --filter` or (`pnpm -F` for short) when you only need to work on one package:

```bash
pnpm -F @transcend-io/cli start
```

## Git Hooks

After a normal install from the repo root, Husky configures local Git hooks automatically.

- `pre-commit`: runs `pnpm quality`
- `pre-push`: runs `pnpm typecheck`, `pnpm test`, and `pnpm check-exports`

These hooks are local guardrails. CI still runs the canonical repo checks on pull requests and
releases.

If you install dependencies with scripts disabled, rerun `pnpm run prepare` from the repo root
before committing.

## Add Or Update A Package

New packages should match the shape used in `packages/core` and `packages/utils` (private
starters that model the layout).

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
- `build`, `typecheck`, `test`, and `check-exports` scripts in each package

## Dependency Management

Shared dependency versions live in `pnpm-workspace.yaml` catalogs.

Guidelines:

- prefer `catalog:` for shared toolchain dependencies
- prefer `workspace:*` for dependencies between local packages
- keep additions consistent with the single-version policy enforced by `syncpack`

## Pull Requests

Before you open a PR:

1. Make the code change.
2. Run targeted package checks while iterating.
3. Run the repo-level checks affected by your change.
4. Add a changeset when required (see **Changesets**).

On pull requests, GitHub Actions runs:

- **`CI`**:
  - `CI / global` job: runs all the standard commands across all packages, such as `test` and `typecheck` commands.
  - Some packages may have their own jobs to add unique checks, such as the `CI / cli`, which ensures that generated CLI files are up to date.
- **`Preview Release`** see [Preview Releases](#preview-releases) for more.

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

On pull requests, [`scripts/check-changeset.mjs`](scripts/check-changeset.mjs) requires a changeset
whenever a PR changes **any** package source under `packages/<name>/…` except paths it ignores. That
includes **private** workspace packages such as `core` and `utils`, not only packages published to
npm. Add a changeset that names the packages whose version should move when the release PR lands;
`changeset publish` still publishes only **public** packages.

It ignores:

- package `README.md` changes
- test files
- generated `dist/` output
- `node_modules/` and `.turbo/`
- _See [`scripts/check-changeset.mjs`](scripts/check-changeset.mjs) for the full list of ignored files._

If a PR has relevant `packages/` changes and does not include a changeset, CI fails.

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

## Turbo Cache

This repo uses Turborepo, which caches package.json script outputs. Try running `pnpm build` twice to see the cache in action.

### Remote Cache

CI and release workflows can use Turbo remote caching when `secrets.TURBO_TOKEN` and
`vars.TURBO_TEAM` are configured. This is not yet configured. Local development does not require remote cache.
