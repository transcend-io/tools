# @transcend-io/airgap.js-types

## 14.2.1

### Patch Changes

- c8e24e5: Update additionalConsentProviderId to be a string in NonTcfVendor

## 14.2.0

### Minor Changes

- 0252b43: Add `package.json` `exports` subpath pattern `"./*"` so consumers can import built modules by path (for example `@transcend-io/airgap.js-types/constants`, `@transcend-io/airgap.js-types/core`, `@transcend-io/airgap.js-types/ui`, `@transcend-io/airgap.js-types/enums/purpose`). Wildcard entries omit the `@transcend-io/source` condition because strict publint cannot validate glob source paths. Add a package-local `.attw.json` with `profile` `node16` so `check:exports` ignores TypeScript `moduleResolution` `node10`, which does not resolve `exports` subpaths.

## 14.1.2

### Patch Changes

- 093bbf7: - Enable tsdown `unbundle` mode so `dist/` is emitted as separate compiled files per source module instead of a single bundled artifact per entry. The package `exports` entry (`. → dist/index.mjs`) is unchanged; this mainly affects the on-disk layout under `dist/` for maintainability and clearer source-to-output mapping.
- 32a8bdb: Update TrackingConsentWithNulls type
- 841a442: Add additionalConsentProviderId to NonTcfVendor codec for Google's Additional Consent String

## 14.1.1

### Patch Changes

- Updated dependencies [bf7e43d]
  - @transcend-io/privacy-types@5.1.6

## 14.1.0

### Minor Changes

- a35dc8b: Narrow `TrackingConsent.purposes` value type from `boolean | string | undefined` to `DefaultConsentConfigValue | undefined`. This restores precise type-checking for purpose values while preserving the accepted runtime shapes of booleans plus the existing Auto markers and BooleanString literals.

## 14.0.1

### Patch Changes

- Updated dependencies [1fdd3b5]
- Updated dependencies [1fdd3b5]
- Updated dependencies [1ed0ef6]
  - @transcend-io/internationalization@4.1.0
  - @transcend-io/privacy-types@5.1.5

## 14.0.0

### Major Changes

- 270f4f2: While this is not intended as a functional change, we’ve migrated GitHub repositories and build tooling
- 270f4f2: While this is not intended as a functional change, we’ve migrated GitHub repositories and build tooling

## 13.0.1

### Patch Changes

- Migrate the package into the tools monorepo: same public API, builds with `tsdown` to `dist/` and follows shared workspace package conventions.
