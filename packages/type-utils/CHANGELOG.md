# @transcend-io/type-utils

## 3.0.1

### Patch Changes

- f252484: Restore compatibility regressions introduced during the monorepo migration.

  `@transcend-io/internationalization` now preserves the browser locale map key union so `BrowserLocaleKey` and related indexing patterns match the pre-migration package surface again. This change also adds an enum regression test to guard the locale typing behavior.

  `@transcend-io/type-utils` uses explicit `fp-ts` runtime entrypoints like `fp-ts/lib/Either.js` and `fp-ts/lib/function.js` so the migrated ESM build also resolves correctly when workspace source files are executed directly. It also restores the older `getKeys` and `getStringKeys` generic bound.

## 3.0.0

### Major Changes

- 8984fb5: Migrate `@transcend-io/type-utils` into the tools monorepo as a first-party workspace package. The package now uses the monorepo's standard build, test, and export conventions while preserving the existing utility and `io-ts` helper surface for internal consumers.

  Update the dependent workspace packages to consume the monorepo-managed `@transcend-io/type-utils` package instead of the previously external dependency reference.

This package was migrated into the tools monorepo from the standalone `@transcend-io/type-utils` repository.

Historical release notes before the monorepo migration live in the standalone package history. Future release entries will be maintained here by Changesets.
