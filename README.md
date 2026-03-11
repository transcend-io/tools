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

## Getting Started

```bash
corepack enable
pnpm install
pnpm quality
pnpm build
pnpm test
```

The expected Node version is pinned in `.node-version`.

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
