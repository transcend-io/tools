# Transcend Developer Tools Monorepo

Modern pnpm/Turborepo workspace for consolidating Transcend's public TypeScript packages under
`@transcend-io/*`.

This scaffold follows the stack in `monorepo-plan.md`: pnpm catalogs, Turborepo, tsdown,
Vitest, Oxlint, Oxfmt, Changesets, attw, and GitHub Actions wired for npm trusted publishing.

## Included Starter Packages

- `@transcend-io/utils`
- `@transcend-io/core`

`@transcend-io/core` depends on `@transcend-io/utils`, so the workspace exercises internal
package linking, build ordering, and export validation out of the box.

## Commands

```bash
pnpm install
pnpm quality
pnpm format
pnpm lint
pnpm syncpack:lint
pnpm typecheck
pnpm build
pnpm test
pnpm check-exports
pnpm changeset
```

## Notes

- Packages use the `@transcend-io/source` custom export condition for live TypeScript resolution
  inside the monorepo.
- `test` and `typecheck` use a shared Turbo `transit` node so dependency changes invalidate
  downstream tasks without forcing build-first execution.
- This repo intentionally keeps `tsconfig.base.json` plus a root `tsconfig.json` with project
  references. That is a deliberate divergence from Turborepo's package-local default because these
  packages optimize for `isolatedDeclarations`, declaration maps, and editor navigation during
  library migration.
- CI and release workflows are ready to use Turbo Remote Cache when `TURBO_TOKEN` and
  `TURBO_TEAM` are configured in GitHub Actions.
- Pull requests that change publishable packages under `packages/` are expected to include a
  changeset file.
- Publishing is ESM-only and wired for Changesets plus npm trusted publishing via GitHub Actions.
- Replace the starter packages in `packages/` as you migrate the existing repositories.
