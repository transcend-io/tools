# @transcend-io/privacy-types

## 5.26.0

### Minor Changes

- a19b07e: Add `viewportHeightOverride` to `LoadOptions` and `overrideLocale` to `SharedLoadOptions` in UI v2 load options.

## 5.25.0

### Minor Changes

- ff0204c: Add `ConsentSite` to `AttributeSupportedResourceType` for Consent Manager domain custom fields. Regenerate CLI transcend.yml JSON schemas to match.

## 5.24.0

### Minor Changes

- 7d1d57c: Add `ViewUsage` (`viewUsage`) to the AD scope catalog, titled "View Usage". Grants view access to organization usage metrics in the Administration Usage dashboard.

## 5.23.0

### Minor Changes

- ea1ab3c: Add `DsrErrorCode.ConflictingDataSiloFilters` (`CONFLICTING_DATA_SILO_FILTERS`) for bulk DSR inputs that set both `dataSiloIds` and `ignoreDataSiloIds`.

## 5.22.0

### Minor Changes

- 6c6ea93: Add `Signals` (`'signals'`) to `ConsentPrecedenceOption` and deprecate `Signal` (`'signal'`) in favor of the plural value. Regenerate CLI transcend.yml JSON schemas to include the new enum value.
- 1f72e6a: add customCssUrlMap to UI v2 load options
- 6a09b61: Add optional `sourceSystem` (non-empty, max 128 chars via `SourceSystemLabel`) and optional per-purpose `timestamp` to `PreferenceStorePurposeResponse`, which flows into `PreferenceStorePurposeUpdate` for PUT `/v1/preferences` and preference query responses (PIK-8191).

## 5.20.0

### Minor Changes

- 9637490: Add dedicated Custom Function scopes to the AD scope catalog: `ViewCustomFunction` and `ManageCustomFunction` (wire values `viewCustomFunction` / `manageCustomFunction`), titled "View Custom Functions" / "Manage Custom Functions". These let Custom Function access be granted independently of the broader Data Map scopes (LINK-7162). Endpoint mapping onto the new scopes lands in a follow-up (LINK-7163).

## 5.19.0

### Minor Changes

- 98eeb1d: `@transcend-io/privacy-types` gains custom function enums (`CustomFunctionType`, `CustomFunctionLifecycleState`, `CustomFunctionVersionLifecycleState`, `CustomFunctionPayloadType`), mirroring the backend's canonical values.

  Add custom function sync support. The SDK gains a customer-ingress code signing helper (`signCustomFunctionCode`, calling Sombra's `/v1/custom/sign` route with bearer authentication) and typed custom function fetch/diff/sync helpers (`fetchAllCustomFunctions`, `syncCustomFunction`). The custom function type/lifecycle/payload-type unions come from the new `@transcend-io/privacy-types` enums, and JWT payload decoding uses `jsonwebtoken`. Existing custom functions are matched by `id` when provided, falling back to exact name, with an error on ambiguous names.

  `createSombraGotInstance` gains a `sombraId` option to connect to a specific (non-primary) Sombra gateway by ID, resolved from the organization's gateway list.

  Creating a GENERAL function without a pinned gateway resolves the organization's primary Sombra (the backend requires an explicit `sombraId` for GENERAL creates); DSR creates never send `sombraId` or `setActive` — the linked data silo dictates the gateway, and DSR functions are always created active (a warning is logged when `promote` is disabled for a DSR create).

  Also adds a test-before-promote flow: `runCustomFunctionTest` test-runs freshly signed code via the `runCustomFunction` mutation (pre-signed JWT pair, `isCustomFunctionTestRun: true`) and reports a `passed` boolean; `syncCustomFunction` accepts a `testPayloads` list (each payload optionally tagged with a `payloadType`, so DSR functions can cover both the default `DATA_POINT` export and the `REQUEST_ENRICHER` enricher export in one push). Every payload runs and all must pass — any failure rejects the push with a new `test-failed` outcome, with per-payload `testResults` (error and logs) attached.

  New DSR functions get their DSR integration created automatically: when a DSR config has no `dataSiloId` and no existing function matches, `syncCustomFunction` creates a `customFunction`-catalog data silo shell (`createCustomFunctionDataSilo`), tests the signed code against it (DSR test payloads always get `extras.dataSilo` injected from the resolved silo, with `title`/`description`/`link` defaulted to satisfy the backend's webhook payload codec), then creates and links the function on a passing test — rolling the silo back (`deleteDataSilo`) when the test or the create itself fails. Sync results now report `dataSiloId` / `createdDataSilo`.

  `makeGraphQLRequest` no longer retries backend payload validation failures (`Failed to decode codec`) — they are deterministic, and retrying repeated the full codec error output.

  Metadata-only changes (description, or name for id-pinned entries) are detected when code and context are unchanged, and update the function record in place — no signing, no test runs, and no new code revision — reported with a new `metadata-updated` outcome. Environment variable _values_ remain undiffable (encrypted at sign time); use `force` for value-only rotations.

## 5.18.0

### Minor Changes

- c198439: Add `DsrErrorCode.RegionNotInWorkflow` for bulk DSR submissions whose region is outside the workflow config's `regionList`.
- 60f2200: Add `DsrErrorCode.TypeNotMatchingWorkflow` and `DsrErrorCode.SubjectTypeNotMatchingWorkflow` with parameterized `DSR_ERROR_MESSAGE` builders, emitted when a bulk DSR submission asserts a `type` or `subjectType` that does not match the targeted workflow config.

## 5.17.0

### Minor Changes

- 2bc0cb2: Add `DsrErrorCode.DropRunNotIntakeEligible` with its `DSR_ERROR_MESSAGE` builder, emitted when a bulk DSR submission references a DROP run whose state no longer accepts intake.

## 5.16.0

### Minor Changes

- 3aab830: Add `DsrErrorCode.DataSiloNotInWorkflow` for bulk DSR submissions that name `dataSiloIds` outside the workflow config's connected set.

## 5.15.0

### Minor Changes

- 2cc726f: Split `LoadOptions.themeConfigMap` so it accepts only `ThemeConfigurationMinimal` values, and add `MobileUiLoadOptions` with `themeConfigMap` mapped to full `ThemeConfiguration` values.

## 5.14.0

### Minor Changes

- 8deab38: Remove `PromptGroup` and `PromptRun` from `AttributeSupportedResourceType`. Attributes remain supported on `Prompt`. Regenerate CLI transcend.yml JSON schemas to match.

## 5.13.0

### Minor Changes

- 6bbe7d9: Remove contract scanning references, drop prompts/prompt partials/prompt groups from inventory push/pull, and delete the SDK sync/fetch helpers that only supported that flow.

## 5.12.0

### Minor Changes

- 188ba6f: Add WAL-10304 bulk DSR submission symbols: `DSR_BULK_SUBMISSION_REJECTED_MESSAGE`. Also add `DsrErrorCode.IdentifierValidationFailed`, `DsrErrorCode.UnsupportedIdentifierName`, and `DsrErrorCode.MissingRequiredEmail` with their `DSR_ERROR_MESSAGE` builders.

## 5.11.0

### Minor Changes

- 29e9d5f: Remove Pathfinder from the tools repo and drop CLI prompt-manager integration: remove `PromptRunProductArea.Pathfinder`, Pathfinder scopes and product, pathfinder.yml schema generation, `TranscendPromptManager`, `reportPromptRun`, and related CLI/SDK types.

## 5.10.2

### Patch Changes

- e68d245: Export `DROP_RECORD_ID_MAX_LENGTH` from `drop.ts` for shared DROP ingress validation.

## 5.10.1

### Patch Changes

- 841f1a9: Scope `DhContextRequired` and `ConcurrentSubmissionConflict` under `DsrBulkErrorCode` (no single `input[]` index can be attributed) and restore `DropIdentifierCoverageMismatch` and `DuplicateDropRecords` message wording from main.

## 5.10.0

### Minor Changes

- da3e443: Publish canonical DSR submission error codes, message builders, numeric limits, and `DsrRequestOutcome`. Per-input failures use `DsrErrorCode` with `DSR_ERROR_MESSAGE`; bulk-call failures use `DsrBulkErrorCode` with `DSR_BULK_ERROR_MESSAGE`.

  `DsrErrorCode` landed in 5.9.0, but no endpoint has ever emitted any of its values. `OPEN_PARENT_REQUEST_EXISTS`, `DUPLICATE_REQUEST`, and `INVALID_INPUT` never had producers (`DUPLICATE_REQUEST` becomes `DsrRequestOutcome.AlreadyOpen` on bulk instead of an error; former `INVALID_INPUT` cases now have dedicated codes). No consumer can depend on removed members. Strict semver would call removing them breaking; this note is what makes the minor bump defensible.

## 5.9.1

### Patch Changes

- 8bfe3cc: Add `DsrErrorCode.DropIdentifierCoverageMismatch` for DROP DSR submit validation.

## 5.9.0

### Minor Changes

- be15c28: Add `DropListType` enum for DROP list types.

## 5.8.5

### Patch Changes

- ac7537b: Add consent triage filters and sorting: `unmappedOnly` (orphaned/unmapped approved data flows), `type` (data flow scope, e.g. CSP), and `minOccurrences` on `consent_list_data_flows`; `minOccurrences` and `occurrences` sorting on `consent_list_cookies`. Clarify `showZeroActivity` semantics so the default `NEEDS_REVIEW` totals reconcile with `consent_get_inventory_stats`.

## 5.8.4

### Patch Changes

- 54f4aff: added hostThemeMap

## 5.8.2

### Patch Changes

- 259151f: Allow null consent UI variant description/userFlow/themeSlug on inventory pull so unset backend fields no longer fail the transcend.yml codec.

## 5.8.1

### Patch Changes

- ccb3c45: Add the Adobe Campaign recipient identifier type.

## 5.8.0

### Minor Changes

- b1750a6: Set PolicyType on policy create in updatePolicies (infer from title or use optional yml type). Pull/push round-trips type on policies.

## 5.7.0

### Minor Changes

- 2355c9e: Add privacy-center sync/pull for displayed-child-organization-uris, workflows-custom-fields-required, footer-layout, footer-links, home, and expandSideMenuByDefault. Honor publishToPrivacyCenter via skipPublish on updatePrivacyCenter. Regenerate transcend.yml JSON schema.

## 5.6.0

### Minor Changes

- 89f4fe5: Add workflow-configs pull and push support for DSR workflow settings. Sync matches by required, unique `internal-name` and creates missing DSR workflows (then updates remaining fields). `action-type` is required; note that changing a workflow's action type creates a new workflow version server-side. Supports title, subtitle, description, data subject, visibility, region collection, region list, per-region expiry times (requires a `default` entry with all values > 0), and attribute keys. Pull is filtered to DSR workflows (preference-management workflows are excluded).

## 5.5.0

### Minor Changes

- b0c9656: Add `DsrErrorCode` for DSR submission API error handling.

## 5.4.0

### Minor Changes

- b12d8c6: Add `WorkflowConfigType` and `WorkflowConfigVisibility` enums for DSR and preference management workflows, with draft/internal/published visibility tiers.

## 5.3.2

### Patch Changes

- 0da7015: Updates ContentFlows to be camelCased

## 5.3.1

### Patch Changes

- 0ae4785: Make `ActivatePolicyEngineBundles` depend on `ManagePolicyEngineBundles` so the Activate scope includes all Manage and View policy permissions (LINK-7130).

## 5.3.0

### Minor Changes

- 6d56588: Add `RestartIdentifierStrategy` enum for DSR restart identifier handling (WAL-7712).

## 5.2.5

### Patch Changes

- 4ba5bfb: add consent variants and themes to inventory push/pull

## 5.2.4

### Patch Changes

- 0e20155: Added themeConfigMap to UI v2 loadOptions; Add minimal verion of themeConfigMap types for bundling

## 5.2.3

### Patch Changes

- Updated dependencies [9b1c5f3]
  - @transcend-io/internationalization@4.1.1

## 5.2.2

### Patch Changes

- c14ba60: Add consent analytics MCP tools (`consent_get_aggregate_analytics`, `consent_get_timeseries_analytics`, `consent_get_analytics_data`) backed by new SDK airgap bundle analytics fetchers and consent analytics enums in privacy-types. Rename `consent_get_triage_stats` to `consent_get_inventory_stats` to clarify it returns inventory counts, not site analytics.

## 5.2.1

### Patch Changes

- 3741ca3: Add `Footer` (`footer`) and `FooterLink` (`footerLink`) to the `CustomizableComponent` enum for Privacy Center footer CSS overrides. Regenerate the CLI `transcend.yml` JSON schema so the new components are reflected.

## 5.2.0

### Minor Changes

- 5538d24: Add Policy Engine (Seneca) control-plane scopes to the AD scope catalog: `ViewPolicyEngineBundles`, `ManagePolicyEngineBundles`, and `ActivatePolicyEngineBundles` (wire values `viewPolicyEngineBundles` / `managePolicyEngineBundles` / `activatePolicyEngineBundles`), titled "View Policy" / "Manage Policy" / "Activate Policy". These authorize the new `/api/v1/policy-engine/*` REST endpoints on the monolith. Also adds a new `TranscendProduct.PolicyEngine` enum value.

  To disambiguate from the new Policy Engine scopes, the two existing Privacy Center scopes are retitled: `ViewPolicies` "View Policies" → "View Privacy Center Policies", and `ManagePolicies` "Manage Policies" → "Manage Privacy Center Policies". Their enum names and wire values (`viewPolicies` / `managePolicies`) are unchanged, so stored API-key scopes and authorization are unaffected.

  Note: the `transcend admin generate-api-keys --scopes` CLI flag accepts scope **titles**, so the accepted values for the two retitled scopes change accordingly ("View Policies" → "View Privacy Center Policies", "Manage Policies" → "Manage Privacy Center Policies"). Automation passing the old titles must be updated.

### Patch Changes

- bf944ab: Deprecate themeConfigMap from LoadOptions

## 5.1.8

### Patch Changes

- b90b468: Add `RulesAutomationRuleTerminalFailure` and `RulesAutomationRuleTerminalFailureAssigned` values to the `ActionItemCode` enum so that Rules Automation rule owners can be notified when a rule hits a terminal execution failure. Regenerate the CLI `transcend.yml` JSON schema so the new codes are reflected.

## 5.1.7

### Patch Changes

- b18f2e8: Added new database driver Trino

## 5.1.6

### Patch Changes

- bf7e43d: Add `ApproximateLocation` (`APPROXIMATE_LOCATION`) to `DefaultDataSubCategoryType` for the LOCATION category.

## 5.1.5

### Patch Changes

- Updated dependencies [1fdd3b5]
- Updated dependencies [1fdd3b5]
- Updated dependencies [1ed0ef6]
  - @transcend-io/internationalization@4.1.0

## 5.1.4

### Patch Changes

- 041d5f9: Add `DROP` value to `RequestOrigin` enum.

## 5.1.4

### Patch Changes

- Add `DROP` value to `RequestOrigin` enum.

## 5.1.3

### Patch Changes

- f0e7400: Add `DOES_NOT_CONTAIN` attribute to `ComparisonOperator` for assessment rules, and regenerate `transcend.yml` JSON schema.

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
