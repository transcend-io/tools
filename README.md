# Transcend Developer Tools Monorepo

Monorepo for Transcend's public TypeScript developer tools and client-facing npm packages under
`@transcend-io/*`.

This repo is built on modern TypeScript library tooling:

- `pnpm` workspaces and catalogs
- `turbo` for orchestration and caching
- `tsdown` for package builds
- `vitest` for tests
- `oxlint` and `oxfmt` for linting and formatting
- `changesets` for versioning and releases
- `attw` for export validation

The architecture and tool choices are documented in `monorepo-plan.md`.
`mise.toml` is the source of truth for the pinned Node runtime, while `package.json` keeps owning
the exact `pnpm` version via `packageManager`.

## Getting Started

Install [`mise`](https://mise.jdx.dev/) first, then bootstrap the repo:

```bash
mise trust mise.toml
mise install
mise run bootstrap
pnpm quality
pnpm build
pnpm test
```

`mise run bootstrap` enables Corepack when needed and installs workspace dependencies with the
repo-pinned `pnpm` version.

## Dev Container

The repo includes a `.devcontainer/devcontainer.json` that installs `mise`, uses the same
`mise.toml`, and caches the `mise` data directory in a named volume. Reopen the workspace in the
devcontainer if you want the same toolchain inside a container.

## Workspace Layout

- `packages/*`: publishable libraries
- `apps/*`: non-publishable apps if we add them later
- `.changeset/*`: release intent files
- `.github/workflows/*`: CI, preview, and release automation

## Included Starter Packages

- `@transcend-io/utils`
- `@transcend-io/core`

`@transcend-io/core` depends on `@transcend-io/utils`, so the workspace exercises internal
package linking, build ordering, and export validation out of the box.

## Common Commands

```bash
pnpm quality
pnpm quality:fix
pnpm format
pnpm format:check
pnpm lint
pnpm lint:fix
pnpm syncpack:lint
pnpm typecheck
pnpm build
pnpm test
pnpm check-exports
pnpm changeset
```

Use `pnpm --filter <package-name> <script>` to run commands against a single package.

## Documentation

- `CONTRIBUTING.md`: day-to-day development, package conventions, changesets, previews, and
  stable releases
- `monorepo-plan.md`: stack rationale and original implementation plan

## Notes

- CI, preview, and release workflows resolve Node from `mise.toml`, so local development and
  GitHub Actions share the same runtime source of truth.
- `.vscode/settings.json` and `.vscode/extensions.json` keep editor integration minimal and aligned
  with `oxfmt`/`oxlint`.
