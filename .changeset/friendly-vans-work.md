---
'@transcend-io/privacy-types': major
---

Migrate `@transcend-io/privacy-types` into the tools monorepo and align it with the shared package conventions.

Material changes:
- the published package now uses the monorepo's ESM-first distribution shape, with an `exports` map and `dist/index.mjs` entrypoint instead of the legacy `build/index` layout
- the package now ships from `dist/` rather than `build/`, so consumers relying on package-internal paths or deep imports to the old filesystem layout will need to update
- the top-level flat API surface is preserved, but the package is now built, tested, and versioned from the tools monorepo
