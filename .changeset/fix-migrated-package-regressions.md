---
'@transcend-io/internationalization': patch
'@transcend-io/type-utils': patch
---

Restore compatibility regressions introduced during the monorepo migration.

`@transcend-io/internationalization` now preserves the browser locale map key union so `BrowserLocaleKey` and related indexing patterns match the pre-migration package surface again. This change also adds an enum regression test to guard the locale typing behavior.

`@transcend-io/type-utils` now uses explicit `fp-ts` runtime entrypoints in the published ESM output so consumer apps can import the package without resolver failures.
