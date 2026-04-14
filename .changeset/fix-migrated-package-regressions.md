---
'@transcend-io/internationalization': patch
'@transcend-io/type-utils': patch
---

Restore compatibility regressions introduced during the monorepo migration.

`@transcend-io/internationalization` now preserves the browser locale map key union so `BrowserLocaleKey` and related indexing patterns match the pre-migration package surface again. This change also adds an enum regression test to guard the locale typing behavior.

`@transcend-io/type-utils` uses explicit `fp-ts` runtime entrypoints like `fp-ts/lib/Either.js` and `fp-ts/lib/function.js` so the migrated ESM build also resolves correctly when workspace source files are executed directly. It also restores the older `getKeys` and `getStringKeys` generic bound.
