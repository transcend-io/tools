# @transcend-io/type-utils

## 3.0.0

### Major Changes

- 8984fb5: Migrate `@transcend-io/type-utils` into the tools monorepo as a first-party workspace package. The package now uses the monorepo's standard build, test, and export conventions while preserving the existing utility and `io-ts` helper surface for internal consumers.

  Update the dependent workspace packages to consume the monorepo-managed `@transcend-io/type-utils` package instead of the previously external dependency reference.

This package was migrated into the tools monorepo from the standalone `@transcend-io/type-utils` repository.

Historical release notes before the monorepo migration live in the standalone package history. Future release entries will be maintained here by Changesets.
