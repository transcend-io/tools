# @transcend-io/airgap.js-types

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
