# @transcend-io/internationalization

## 4.0.0

### Major Changes

- ebc2e91: Migrate `@transcend-io/internationalization` into the tools monorepo and align it with the
  shared package conventions.

  Material changes:
  - the package is now built, tested, versioned, and released from the tools monorepo
  - the top-level API stays compatible, but the published filesystem layout now follows the
    monorepo's `dist/` plus `exports` structure instead of the legacy `build/` output
  - CLI, SDK, and privacy-types now consume the package from the local workspace

This package was migrated into the tools monorepo from the standalone `@transcend-io/internationalization` repository.

Historical release notes before the monorepo migration live in the standalone package history. Future release entries will be maintained here by Changesets.
