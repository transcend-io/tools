---
'@transcend-io/cli': patch
'@transcend-io/internationalization': major
'@transcend-io/privacy-types': patch
'@transcend-io/sdk': patch
---

Migrate `@transcend-io/internationalization` into the tools monorepo and align it with the
shared package conventions.

Material changes:

- the package is now built, tested, versioned, and released from the tools monorepo
- the top-level API stays compatible, but the published filesystem layout now follows the
  monorepo's `dist/` plus `exports` structure instead of the legacy `build/` output
- CLI, SDK, and privacy-types now consume the package from the local workspace
