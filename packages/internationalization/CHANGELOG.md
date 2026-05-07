# @transcend-io/internationalization

## 4.1.0

### Minor Changes

- 1fdd3b5: Adds support for RTL languages
- 1fdd3b5: Added support for RTL languages
- 1ed0ef6: Added deprecated language/locale codes (no, iw, no-NO, iw-IL) for DSR Submission API backward compatibility

## 4.0.1

### Patch Changes

- f252484: Restore compatibility regressions introduced during the monorepo migration.

  `@transcend-io/internationalization` now preserves the browser locale map key union so `BrowserLocaleKey` and related indexing patterns match the pre-migration package surface again. This change also adds an enum regression test to guard the locale typing behavior.

  `@transcend-io/type-utils` uses explicit `fp-ts` runtime entrypoints like `fp-ts/lib/Either.js` and `fp-ts/lib/function.js` so the migrated ESM build also resolves correctly when workspace source files are executed directly. It also restores the older `getKeys` and `getStringKeys` generic bound.

## 4.0.0

### Major Changes

- ebc2e91: Migrate `@transcend-io/internationalization` into the tools monorepo and align it with the
  shared package conventions.

  Material changes:
  - the package is now built, tested, versioned, and released from the tools monorepo
  - the top-level API stays compatible, but the published filesystem layout now follows the
    monorepo's `dist/` plus `exports` structure instead of the legacy `build/` output
  - CLI, SDK, and privacy-types now consume the package from the local workspace
