# Contributing

## Overview

This repository is a `pnpm` + Turborepo monorepo for publishable `@transcend-io/*` TypeScript
packages.

The root package is private. The publishable packages live under `packages/`.

## Prerequisites

- Node.js 22
- pnpm 10
- Corepack enabled

```bash
corepack enable
pnpm install
```

The expected Node version is pinned in `.node-version`.

## Repository Layout

- `packages/*`: publishable libraries
- `apps/*`: non-publishable apps if we add them later
- `.changeset/*`: release intent files for Changesets
- `.github/workflows/*`: CI, preview, and release automation
- `scripts/check-changeset.mjs`: PR-time enforcement for missing changesets

## Daily Development

For most changes, the basic loop is:

1. Install dependencies with `pnpm install`.
2. Make your code changes in the relevant workspace package.
3. Run targeted package commands while iterating.
4. Run repo-level checks before opening a PR.
5. Add a changeset if you changed a publishable package.

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

- `pnpm quality`: formatting, lint, and dependency-policy checks
- `pnpm quality:fix`: auto-fix formatting and lint issues where possible
- `pnpm typecheck`: run TypeScript checks across workspace packages
- `pnpm build`: build publishable packages with `tsdown`
- `pnpm test`: run package tests with Vitest
- `pnpm check-exports`: validate published package shape with `attw`

## Running Commands For One Package

Use `pnpm --filter` when you only need to work on one package:

```bash
pnpm --filter @transcend-io/core build
pnpm --filter @transcend-io/core test
pnpm --filter @transcend-io/core typecheck
```

This is the fastest way to iterate on a single workspace package before running the full repo
checks.

## Adding Or Updating A Package

New publishable packages should follow the same shape as the starter packages in `packages/core`
and `packages/utils`.

For a new package:

1. Create `packages/<name>/package.json`.
2. Add `tsconfig.json`, `tsdown.config.ts`, and `src/index.ts`.
3. Add tests if the package has behavior worth validating.
4. Add the package path to the root `tsconfig.json` references list.
5. If the package depends on another workspace package, use `workspace:*`.
6. Use shared tool dependencies via `catalog:` instead of hardcoding versions.

Current package conventions:

- ESM-only packages with `"type": "module"`
- Published entrypoints served from `dist/`
- Live source resolution inside the monorepo via the `@transcend-io/source` export condition
- `build`, `typecheck`, `test`, and `check-exports` scripts in each publishable package

## Dependency Management

This repo uses pnpm catalogs from `pnpm-workspace.yaml` for shared dependency versions.

Guidelines:

- Prefer `catalog:` for shared toolchain dependencies
- Prefer `workspace:*` for dependencies between local packages
- Keep dependency additions consistent with the single-version policy enforced by `syncpack`

## Changesets

Changesets are how this repo records release intent.

Create one with:

```bash
pnpm changeset
```

You should add a changeset when a PR changes a publishable package under `packages/` in a way that
should result in a release.

The CI helper script at `scripts/check-changeset.mjs` enforces this on pull requests. It ignores:

- package `README.md` changes
- test-only changes
- generated `dist/` output
- `node_modules/` and `.turbo/`

If a PR changes a publishable package and does not include a changeset, CI will fail.

## Pull Requests

For a normal package change:

1. Make the code change.
2. Run targeted checks while iterating.
3. Run the repo-level checks you expect to be affected.
4. Add a changeset if the package should be released.
5. Open a PR.

On pull requests, GitHub Actions runs:

- `CI`: dependency policy, lint, format check, typecheck, build, test, and export validation
- `Preview Release`: build plus `pkg.pr.new` preview publishing

`pkg.pr.new` gives us installable preview packages for a PR without publishing to npm.

## Releasing

Stable releases are driven by Changesets plus GitHub Actions.

### How stable releases work

1. A PR lands on `main` with one or more changeset files in `.changeset/`.
2. The `Release` workflow runs on pushes to `main`.
3. That workflow reruns the release safety checks:
   `syncpack:lint`, `lint`, `format:check`, `typecheck`, `build`, `test`, and `check-exports`.
4. After those pass, `changesets/action` runs:
   - `pnpm version-packages` to create or update the release PR
   - `pnpm release` when the repo is already versioned and ready to publish
5. `pnpm release` currently runs `turbo run build && changeset publish`.

In practice, this usually means:

1. Feature PRs add changesets.
2. Merging those PRs to `main` causes Changesets to open or update a release PR with version bumps
   and changelog updates.
3. Merging the release PR triggers the actual npm publish.

### Preview releases

Pull requests also get preview packages via `pkg.pr.new`.

Those previews are useful when you want another repo or integration environment to test a package
before a stable npm release.

### Trusted publishing

This repo is set up for npm trusted publishing via GitHub OIDC.

That means:

- the GitHub workflow has `id-token: write`
- we do not rely on a long-lived `NPM_TOKEN` for normal publishing
- each published package still needs to be configured in npm to trust this repository/workflow

If npm trusted publishing is not configured for a package, the release workflow will build and
version correctly but fail at publish time.

### Manual releases

`release.yml` also supports `workflow_dispatch`.

Use that for reruns or recovery when necessary, not as the normal release path. The normal flow is
still:

1. merge package PRs with changesets
2. merge the release PR
3. let GitHub Actions publish

## Remote Cache

CI and release workflows are ready for Turbo remote caching when these GitHub settings are present:

- `secrets.TURBO_TOKEN`
- `vars.TURBO_TEAM`

Local development does not require remote cache.

## Before You Merge

Before merging a package-affecting PR, make sure:

- the relevant tests pass
- `pnpm typecheck` is clean for the affected packages
- `pnpm check-exports` passes if you changed package entrypoints or manifest exports
- a changeset is included when the change should ship to npm
