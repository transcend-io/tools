---
'@transcend-io/cli': patch
'@transcend-io/privacy-types': patch
'@transcend-io/sdk': patch
'@transcend-io/type-utils': major
'@transcend-io/utils': patch
---

Migrate `@transcend-io/type-utils` into the tools monorepo as a first-party workspace package. The package now uses the monorepo's standard build, test, and export conventions while preserving the existing utility and `io-ts` helper surface for internal consumers.

Update the dependent workspace packages to consume the monorepo-managed `@transcend-io/type-utils` package instead of the previously external dependency reference.
