---
'@transcend-io/internationalization': patch
'@transcend-io/type-utils': patch
---

Restore compatibility regressions introduced during the monorepo migration.

`@transcend-io/internationalization` now preserves the browser locale map key union so `BrowserLocaleKey` and related indexing patterns match the pre-migration package surface again. This change also adds an enum regression test to guard the locale typing behavior.

`@transcend-io/type-utils` switches `fp-ts` usage to module imports like `fp-ts/Either` and `fp-ts/function`, matching the upstream package guidance for the migrated ESM build. It also restores the older `getKeys` and `getStringKeys` generic bound.
