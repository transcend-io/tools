# @transcend-io/privacy-types

## 5.0.1

### Patch Changes

- f08af44: Add `URL` and `EMAIL` variants to `AssessmentQuestionType` for assessment form questions, and regenerate `transcend.yml` JSON schema.
- 415887f: Move code package fetch functions from CLI to SDK
  - Add `code-intelligence/` module to SDK: `fetchAllCodePackages`
  - Add `dsr-automation/` module to SDK: actions, templates, catalogs, silo discovery
  - Migrated: `fetchAllActions`, `syncAction`, `fetchAllTemplates`, `syncTemplate`, `fetchAllCatalogs`, `fetchAndIndexCatalogs`, `uploadSiloDiscoveryResults`, `fetchAllSiloDiscoveryResults`, `fetchActiveSiloDiscoPlugin`
  - All imports updated to use `@transcend-io/sdk` directly

- cac80a5: Add publint
- 7816fc0: make css LoadOption optional

## 5.0.0

### Major Changes

- 20d052a: Migrate `@transcend-io/privacy-types` into the tools monorepo and align it with the shared package conventions.

  Material changes:
  - the published package now uses the monorepo's ESM-first distribution shape, with an `exports` map and `dist/index.mjs` entrypoint instead of the legacy `build/index` layout
  - the package now ships from `dist/` rather than `build/`, so consumers relying on package-internal paths or deep imports to the old filesystem layout will need to update
  - the top-level flat API surface is preserved, but the package is now built, tested, and versioned from the tools monorepo
