# @transcend-io/privacy-types

## 5.1.2

### Patch Changes

- Updated dependencies [f252484]
  - @transcend-io/internationalization@4.0.1
  - @transcend-io/type-utils@3.0.1

## 5.1.1

### Patch Changes

- ebc2e91: Migrate `@transcend-io/internationalization` into the tools monorepo and align it with the
  shared package conventions.

  Material changes:
  - the package is now built, tested, versioned, and released from the tools monorepo
  - the top-level API stays compatible, but the published filesystem layout now follows the
    monorepo's `dist/` plus `exports` structure instead of the legacy `build/` output
  - CLI, SDK, and privacy-types now consume the package from the local workspace

- 8984fb5: Migrate `@transcend-io/type-utils` into the tools monorepo as a first-party workspace package. The package now uses the monorepo's standard build, test, and export conventions while preserving the existing utility and `io-ts` helper surface for internal consumers.

  Update the dependent workspace packages to consume the monorepo-managed `@transcend-io/type-utils` package instead of the previously external dependency reference.

- Updated dependencies [ebc2e91]
- Updated dependencies [8984fb5]
  - @transcend-io/internationalization@4.0.0
  - @transcend-io/type-utils@3.0.0

## 5.1.0

### Minor Changes

- 8185679: feat(sdk): split consent GQL queries into domain files with shared types

  **SDK (`@transcend-io/sdk`):**
  - Split monolithic `consent/gqls/consentManager.ts` (800+ lines) into domain-focused modules: `cookies.ts`, `dataFlows.ts`, `experiences.ts`, `purposes.ts`, `partitions.ts`, `stats.ts`, `consentManager.ts`
  - Add shared field selection constants (`SERVICE_FIELDS`, `TRACKING_PURPOSE_FIELDS`, `OWNER_FIELDS`, `TEAM_FIELDS`, `ATTRIBUTE_VALUE_FIELDS`) to deduplicate GQL field lists across queries
  - Add `Transcend*Gql` response types next to every GQL constant (e.g. `TranscendCliCookiesResponse`, `TranscendCliDataFlowsResponse`)
  - Add missing GQL queries: `PURPOSES`, `COOKIE_STATS`, `DATA_FLOW_STATS`, `DELETE_COOKIES`, `DELETE_DATA_FLOWS`
  - Extend `DATA_FLOWS` and `COOKIES` queries with parameterized `$filterBy`/`$orderBy` variables and triage fields (`occurrences`, `frequency`, `purposes`, etc.)
  - Extend `UPDATE_DATA_FLOWS` mutation to return full data flow fields
  - Add `totalCount` to `EXPERIENCES` query response
  - Add `id` to owners, teams, and attribute values in all GQL selections
  - Move generic types (`TranscendOwnerGql`, `TranscendTeamGql`, `TranscendAttributeValueGql`) to SDK-wide `gqls/shared.ts`
  - Delete redundant type aliases (`Cookie`, `DataFlow`, `ConsentManagerTheme`, `TranscendPartition`) from fetch/sync files; use GQL types directly
  - Expose optional `orderBy` parameter in `fetchAllDataFlows` and `fetchAllCookies`
  - Add barrel exports: `consent/gqls/index.ts` and `gqls/index.ts`

  **Privacy Types (`@transcend-io/privacy-types`):**
  - Add `OrderDirection` enum (`Asc = 'ASC'`, `Desc = 'DESC'`)

  **MCP Server Core (`@transcend-io/mcp-server-core`):**
  - Make `TranscendGraphQLBase.makeRequest` public (was `protected`)
  - Remove consent-specific types from `types/transcend.ts` (moved to SDK)
  - Remove `@transcend-io/privacy-types` re-exports (consumers import directly)

  **MCP Server Consent (`@transcend-io/mcp-server-consent`):**
  - **BREAKING:** Delete `graphql.ts` (`ConsentMixin`) — tools now call `makeRequest` directly with GQL from SDK
  - **BREAKING:** Remove `airgap_bundle_id` from all tool inputs — auto-resolved from API key via `resolveAirgapBundleId`
  - **BREAKING:** Merge `consent_list_triage_cookies`/`consent_list_triage_data_flows` into `consent_list_cookies`/`consent_list_data_flows` with required `status` filter
  - **BREAKING:** Rename tool `consent_list_triage_cookies` → `consent_list_cookies`, `consent_list_triage_data_flows` → `consent_list_data_flows`
  - Replace hardcoded regimes with real `EXPERIENCES` API call
  - Add `show_zero_activity` support to `consent_get_triage_stats`
  - Use `ConsentTrackerStatus`/`OrderDirection` enums from `@transcend-io/privacy-types` instead of hardcoded strings
  - Import all GQL response types from SDK — zero inline `makeRequest<{...}>` type parameters

  **Future work:** Reuse SDK fetch functions (`fetchAllDataFlows`, `fetchConsentManagerExperiences`) directly once `TranscendGraphQLBase` is compatible with `graphql-request`'s `GraphQLClient` interface.

- 29868af: refactor: deduplicate enums and replace inline strings with shared privacy-types

  Add CookieOrderField, DataFlowOrderField, DataFlowType, TriageAction, and ConsentTrackerType enums to privacy-types. Replace z.string() tool params with proper enum types (ScopeName, AssessmentFormTemplateStatus). Enrich admin_create_api_key with TRANSCEND_SCOPES metadata.

### Patch Changes

- a15fed8: Bump `@transcend-io/internationalization` from ^2.3.2 to ^3.0.0.

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
