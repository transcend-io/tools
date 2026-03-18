# Contributing

## What This Repo Is

This repository is a `pnpm` + Turborepo monorepo for public `@transcend-io/*` TypeScript
packages.

The root package is private. Publishable packages live in `packages/`. The current `core` and
`utils` packages are starter packages meant to exercise the toolchain, so treat them as examples
more than mature product libraries.

## Setup

Install `mise`, then run:

```bash
mise trust mise.toml
mise install
mise run bootstrap
```

`mise.toml` pins the Node version for local development, devcontainers, and CI. `package.json`
pins the exact `pnpm` version.

## Repo Layout

- `packages/*`: publishable libraries
- `apps/*`: reserved for non-publishable apps; empty today
- `.changeset/*`: release intent files for Changesets
- `.github/workflows/*`: CI, preview, and release automation
- `scripts/check-changeset.mjs`: PR check for missing changesets

## Daily Workflow

1. Run `mise run bootstrap` after cloning and whenever dependencies change.
2. Make your change in the relevant package.
3. While iterating, run targeted commands with `pnpm --filter`.
4. Before opening a PR, run the repo-level checks affected by your change.
5. Add a changeset if the change should publish a package release.

## Common Commands

Run these from the repo root:

```bash
pnpm quality
pnpm quality:fix
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm syncpack:lint
pnpm typecheck
pnpm build
pnpm test
pnpm check-exports
pnpm changeset
```

What they do:

- `pnpm quality`: run formatting, lint, and dependency-policy checks
- `pnpm quality:fix`: auto-fix formatting and lint issues where possible
- `pnpm lint`: run `oxlint` across the repo
- `pnpm lint:fix`: run `oxlint --fix` across the repo
- `pnpm format`: format the repo with `oxfmt`
- `pnpm format:check`: verify formatting with `oxfmt --check`
- `pnpm syncpack:lint`: enforce dependency version policy
- `pnpm typecheck`: run TypeScript checks across workspace packages
- `pnpm build`: build publishable packages with `tsdown`
- `pnpm test`: run package tests with Vitest
- `pnpm check-exports`: validate published package shape with `attw`
- `pnpm changeset`: create a changeset file

## Run One Package

Use `pnpm --filter` when you only need to work on one package:

```bash
pnpm --filter @transcend-io/core build
pnpm --filter @transcend-io/core test
pnpm --filter @transcend-io/core typecheck
pnpm --filter @transcend-io/core check-exports
```

This is the fastest way to iterate on a single package before running the full repo checks.

## Add Or Update A Package

New publishable packages should match the shape used in `packages/core` and `packages/utils`.

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
- `build`, `typecheck`, `test`, and `check-exports` scripts in each publishable package

## Dependency Management

Shared dependency versions live in `pnpm-workspace.yaml` catalogs.

Guidelines:

- prefer `catalog:` for shared toolchain dependencies
- prefer `workspace:*` for dependencies between local packages
- keep additions consistent with the single-version policy enforced by `syncpack`

## Changesets

Changesets record release intent.

Create one with:

```bash
pnpm changeset
```

Add a changeset when you change a publishable package under `packages/` and that change should
ship to npm.

`scripts/check-changeset.mjs` enforces this on pull requests. It ignores:

- package `README.md` changes
- test files
- generated `dist/` output
- `node_modules/` and `.turbo/`

If a PR changes a publishable package and does not include a changeset, CI fails.

## Pull Requests

Before you open a PR:

1. Make the code change.
2. Run targeted package checks while iterating.
3. Run the repo-level checks affected by your change.
4. Add a changeset if the package should be released.

On pull requests, GitHub Actions runs:

- `CI`: the changeset check, `syncpack:lint`, `lint`, `format:check`, `typecheck`, `build`,
  `test`, and `check-exports`
- `Preview Release`: `build` plus `pkg.pr.new` preview publishing

`pkg.pr.new` gives us installable preview packages for a PR without publishing to npm.

## Releases

Stable releases are driven by Changesets and the `Release` workflow.

Normal flow:

1. Merge feature PRs with changesets into `main`.
2. The `Release` workflow reruns `syncpack:lint`, `lint`, `format:check`, `typecheck`, `build`,
   `test`, and `check-exports`.
3. `changesets/action` either opens or updates the release PR with `pnpm version-packages`, or
   publishes with `pnpm release` when the repo is already versioned and ready.
4. `pnpm release` runs `turbo run build && changeset publish`.
5. Merging the release PR triggers the npm publish.

### Preview Releases

Pull requests also get preview packages via `pkg.pr.new`. Use those when another repo or
environment needs to test package changes before a stable release.

### Trusted Publishing

This repo is set up for npm trusted publishing via GitHub OIDC. The workflow has `id-token: write`,
and normal publishing should not require a long-lived `NPM_TOKEN`. Each published package still has
to be configured in npm to trust this repository and workflow.

If npm trusted publishing is not configured for a package, the release workflow will build and
version correctly but fail at publish time.

### Manual Releases

`release.yml` also supports `workflow_dispatch`. Use that for reruns or recovery, not as the normal
release path.

## Remote Cache

CI and release workflows can use Turbo remote caching when `secrets.TURBO_TOKEN` and
`vars.TURBO_TEAM` are configured. Local development does not require remote cache.

## Before You Merge

Before merging a package-affecting PR, make sure:

- the relevant tests pass
- `pnpm typecheck` is clean for the affected packages
- `pnpm check-exports` passes if you changed entrypoints or manifest exports
- a changeset is included when the change should ship to npm
