# @transcend-io/mcp-server-consent

## 0.9.5

### Patch Changes

- Updated dependencies [ff0204c]
  - @transcend-io/privacy-types@5.25.0
  - @transcend-io/sdk@2.1.3

## 0.9.4

### Patch Changes

- 2a6a955: Fixes a lot of Sombra tools
- Updated dependencies [2a6a955]
- Updated dependencies [557a80b]
  - @transcend-io/mcp-server-base@1.8.0

## 0.9.3

### Patch Changes

- Updated dependencies [5b97f8e]
  - @transcend-io/mcp-server-base@1.7.4

## 0.9.2

### Patch Changes

- ef34d80: Decouple `destructiveHint` from server confirmation gates so consequential
  consent writes can require approval without marking them destructive to hosts.

  Gate `consent_set_preferences`, `preferences_upsert`, and
  `preferences_append_identifiers` behind human confirmation while keeping
  `destructiveHint: false`.

- Updated dependencies [ef34d80]
  - @transcend-io/mcp-server-base@1.7.3

## 0.9.1

### Patch Changes

- cef7025: Ignore Vite-built MCP App documents from the repo root instead of a per-package
  gitignore.

## 0.9.0

### Minor Changes

- 4c1b802: Add an MCP App view to `consent_get_inventory_stats` that renders cookie and
  data-flow triage counts.

### Patch Changes

- Updated dependencies [656903e]
  - @transcend-io/mcp-server-base@1.7.2

## 0.8.4

### Patch Changes

- Updated dependencies [7d1d57c]
  - @transcend-io/privacy-types@5.24.0
  - @transcend-io/sdk@2.1.2

## 0.8.3

### Patch Changes

- Updated dependencies [4aa92a1]
  - @transcend-io/mcp-server-base@1.7.1

## 0.8.2

### Patch Changes

- Updated dependencies [ea1ab3c]
  - @transcend-io/privacy-types@5.23.0
  - @transcend-io/sdk@2.1.1

## 0.8.1

### Patch Changes

- Updated dependencies [732e769]
  - @transcend-io/mcp-server-base@1.7.0

## 0.8.0

### Minor Changes

- bfd2b1a: Make `consent_get_inventory_stats` data-flow counts match the Consent Manager table (CSP rows omitted, same as the UI).

  `consent_list_cookies` and `consent_list_data_flows` now paginate with shared `OffsetPaginationSchema` (`first`/`offset`) instead of a custom `limit`/`offset` pair.

### Patch Changes

- Updated dependencies [d00bd92]
- Updated dependencies [6c6ea93]
- Updated dependencies [2b82ee8]
- Updated dependencies [bd397d4]
- Updated dependencies [1f72e6a]
- Updated dependencies [6a09b61]
- Updated dependencies [a5e8334]
  - @transcend-io/mcp-server-base@1.6.0
  - @transcend-io/privacy-types@5.22.0
  - @transcend-io/sdk@2.1.0

## 0.7.1

### Patch Changes

- Updated dependencies [9032822]
  - @transcend-io/mcp-server-base@1.5.0

## 0.7.0

### Minor Changes

- c8df618: Add MCP prompts support to mcp-server-base (`prompts/list` and `prompts/get`), and ship three consent workflow prompts (`consent-triage`, `consent-research-tracker`, `consent-inspect-site`) on the consent and umbrella servers.

### Patch Changes

- Updated dependencies [c8df618]
- Updated dependencies [9637490]
  - @transcend-io/mcp-server-base@1.4.0
  - @transcend-io/privacy-types@5.20.0
  - @transcend-io/sdk@2.0.1

## 0.6.17

### Patch Changes

- Updated dependencies [98eeb1d]
- Updated dependencies [43d6ffe]
  - @transcend-io/sdk@2.0.0
  - @transcend-io/privacy-types@5.19.0
  - @transcend-io/mcp-server-base@1.3.1

## 0.6.16

### Patch Changes

- Updated dependencies [5819bc1]
- Updated dependencies [c787e9d]
  - @transcend-io/mcp-server-base@1.3.0

## 0.6.15

### Patch Changes

- Updated dependencies [4404c48]
- Updated dependencies [c198439]
- Updated dependencies [60f2200]
- Updated dependencies [7d980a1]
  - @transcend-io/mcp-server-base@1.2.0
  - @transcend-io/privacy-types@5.18.0
  - @transcend-io/sdk@1.9.5

## 0.6.14

### Patch Changes

- 26fadc4: Remove the `confirmationHint` field and its remaining call-site strings. #407 removed it from 25 tools; nine occurrences have re-appeared since (three in the platform interfaces and six in inventory / consent / dsr feature PRs). No code reads the field, so this is dead metadata. The upcoming confirmation-gate work introduces a separate `confirmation: { hint }` field with a semantic contract — deleting the old one first keeps that landing focused on adding the new API.
- Updated dependencies [26fadc4]
  - @transcend-io/mcp-server-base@1.1.1

## 0.6.13

### Patch Changes

- Updated dependencies [2bc0cb2]
  - @transcend-io/privacy-types@5.17.0
  - @transcend-io/sdk@1.9.4

## 0.6.12

### Patch Changes

- Updated dependencies [3aab830]
  - @transcend-io/privacy-types@5.16.0
  - @transcend-io/sdk@1.9.3

## 0.6.11

### Patch Changes

- 80d9f9e: Remove unused `confirmationHint` strings from 25 ungated tools. The field is never serialized into `tools/list` and is only read by the confirmation gate, which none of these tools opt into.
- Updated dependencies [2faaff6]
- Updated dependencies [5b239dc]
- Updated dependencies [5b239dc]
- Updated dependencies [6293072]
- Updated dependencies [daffc18]
- Updated dependencies [dc9ab41]
- Updated dependencies [5b239dc]
- Updated dependencies [97fa941]
- Updated dependencies [5b239dc]
  - @transcend-io/mcp-server-base@1.1.0

## 0.6.10

### Patch Changes

- @transcend-io/mcp-server-base@1.0.0

## 0.6.9

### Patch Changes

- Updated dependencies [f6ca084]
- Updated dependencies [2cc726f]
- Updated dependencies [66e641e]
  - @transcend-io/mcp-server-base@0.14.0
  - @transcend-io/privacy-types@5.15.0
  - @transcend-io/sdk@1.9.2

## 0.6.8

### Patch Changes

- Updated dependencies [8deab38]
  - @transcend-io/privacy-types@5.14.0
  - @transcend-io/sdk@1.9.1

## 0.6.7

### Patch Changes

- 6d2b56d: Publish sourcemaps that reference their sources rather than embedding them, taking the maps across these packages from roughly 817 KB to 174 KB.

  Stack traces keep their mapped TypeScript positions; what is lost is the surrounding code frame, and only where the sources are not on disk. A fair trade for a server a host launches as a subprocess, and the reason this is scoped to the MCP packages rather than set for every published library.

- Updated dependencies [4bc21f7]
- Updated dependencies [e127dfc]
- Updated dependencies [f3ce7dc]
- Updated dependencies [6d2b56d]
- Updated dependencies [6bbe7d9]
  - @transcend-io/mcp-server-base@0.13.0
  - @transcend-io/privacy-types@5.13.0
  - @transcend-io/sdk@1.9.0

## 0.6.6

### Patch Changes

- Updated dependencies [1b93859]
- Updated dependencies [1b93859]
- Updated dependencies [1b93859]
- Updated dependencies [c166809]
- Updated dependencies [1b93859]
- Updated dependencies [188ba6f]
  - @transcend-io/mcp-server-base@0.12.0
  - @transcend-io/privacy-types@5.12.0
  - @transcend-io/sdk@1.8.1

## 0.6.5

### Patch Changes

- Updated dependencies [6932df1]
- Updated dependencies [29e9d5f]
  - @transcend-io/mcp-server-base@0.11.0
  - @transcend-io/privacy-types@5.11.0
  - @transcend-io/sdk@1.8.0

## 0.6.4

### Patch Changes

- Updated dependencies [e68d245]
  - @transcend-io/privacy-types@5.10.2
  - @transcend-io/sdk@1.7.7

## 0.6.3

### Patch Changes

- Updated dependencies [841f1a9]
  - @transcend-io/privacy-types@5.10.1
  - @transcend-io/sdk@1.7.6

## 0.6.2

### Patch Changes

- Updated dependencies [da3e443]
- Updated dependencies [8034d59]
- Updated dependencies [c00f3c5]
  - @transcend-io/privacy-types@5.10.0
  - @transcend-io/mcp-server-base@0.10.0
  - @transcend-io/sdk@1.7.5

## 0.6.1

### Patch Changes

- Updated dependencies [8bfe3cc]
- Updated dependencies [c65d41e]
  - @transcend-io/privacy-types@5.9.1
  - @transcend-io/mcp-server-base@0.9.0
  - @transcend-io/sdk@1.7.4

## 0.6.0

### Minor Changes

- 637b357: Enables sombra integration with mcp

### Patch Changes

- 29821b9: Adds consent package for resolving sombra url
- cf74715: enforce orgs mcp x sombra setting
- fb24b96: Adds sombra metadata to tools
- Updated dependencies [cf74715]
- Updated dependencies [29821b9]
- Updated dependencies [fb24b96]
- Updated dependencies [637b357]
  - @transcend-io/mcp-server-base@0.8.0

## 0.5.1

### Patch Changes

- Updated dependencies [be15c28]
  - @transcend-io/privacy-types@5.9.0
  - @transcend-io/sdk@1.7.3

## 0.5.0

### Minor Changes

- ac7537b: Add consent triage filters and sorting: `unmappedOnly` (orphaned/unmapped approved data flows), `type` (data flow scope, e.g. CSP), and `minOccurrences` on `consent_list_data_flows`; `minOccurrences` and `occurrences` sorting on `consent_list_cookies`. Clarify `showZeroActivity` semantics so the default `NEEDS_REVIEW` totals reconcile with `consent_get_inventory_stats`.

### Patch Changes

- Updated dependencies [ac7537b]
  - @transcend-io/privacy-types@5.8.5
  - @transcend-io/sdk@1.7.2

## 0.4.12

### Patch Changes

- Updated dependencies [54f4aff]
  - @transcend-io/privacy-types@5.8.4
  - @transcend-io/sdk@1.7.1

## 0.4.11

### Patch Changes

- Updated dependencies [e410109]
  - @transcend-io/mcp-server-base@0.7.0

## 0.4.10

### Patch Changes

- Updated dependencies [3f41944]
  - @transcend-io/mcp-server-base@0.6.2

## 0.4.9

### Patch Changes

- Updated dependencies [259151f]
- Updated dependencies [55358da]
  - @transcend-io/privacy-types@5.8.2
  - @transcend-io/sdk@1.7.0

## 0.4.8

### Patch Changes

- Updated dependencies [ccb3c45]
  - @transcend-io/privacy-types@5.8.1
  - @transcend-io/sdk@1.6.1

## 0.4.7

### Patch Changes

- Updated dependencies [b1750a6]
- Updated dependencies [941113c]
  - @transcend-io/privacy-types@5.8.0
  - @transcend-io/sdk@1.6.0

## 0.4.6

### Patch Changes

- Updated dependencies [97db927]
- Updated dependencies [2355c9e]
  - @transcend-io/sdk@1.5.0
  - @transcend-io/privacy-types@5.7.0

## 0.4.5

### Patch Changes

- Updated dependencies [89f4fe5]
  - @transcend-io/sdk@1.4.0
  - @transcend-io/privacy-types@5.6.0

## 0.4.4

### Patch Changes

- cbe9d3a: Update links in the readmes
- Updated dependencies [cbe9d3a]
- Updated dependencies [b0c9656]
  - @transcend-io/mcp-server-base@0.6.1
  - @transcend-io/privacy-types@5.5.0
  - @transcend-io/sdk@1.3.1

## 0.4.3

### Patch Changes

- Updated dependencies [9ebf2c3]
  - @transcend-io/sdk@1.3.0

## 0.4.2

### Patch Changes

- 8fb4627: **@transcend-io/mcp-server-base:** Add per-tool `requireAuth` (call time) and `requireStartupAuth` on `createMCPServer` (boot). Add optional MCP initialize `instructions` on `buildMcpServer`, plus `resolveStdioStartupAuthOptional` for servers that include public tools.

  **@transcend-io/mcp-server-docs:** Docs tools set `requireAuth: false` so they skip lazy OAuth. Standalone CLI uses `requireStartupAuth: false` (no API key or OAuth at startup). Remove unused docs OAuth scopes.

  **@transcend-io/mcp:** Umbrella server uses optional startup auth, registers docs tools first, and ships initialize instructions guiding agents to `transcend_docs_list` / `transcend_docs_fetch` before org-specific API tools. Read CLI version from `package.json`.

  **Domain MCP servers:** Read CLI version from `package.json` instead of a hardcoded value.

- Updated dependencies [8fb4627]
  - @transcend-io/mcp-server-base@0.6.0

## 0.4.1

### Patch Changes

- Updated dependencies [b12d8c6]
  - @transcend-io/privacy-types@5.4.0
  - @transcend-io/sdk@1.2.11

## 0.4.0

### Minor Changes

- 8240631: Updates docs to direct users in integrating mcp with oauth
- 6a48672: Adopt typed `graphql()` operations across every MCP server, plus tool input
  parameter cleanups that surfaced during the migration.

  Schema-level changes:
  - All hand-written GraphQL strings are replaced with `graphql()`-tagged
    `TypedDocumentNode`s generated from the committed `schema.graphql`. Any
    drift between the consumer operation and the staging schema now fails
    `tsc` instead of slipping through to a runtime error.
  - `admin_create_api_key` returns the same shape (`apiKey`, `token`,
    `warning`, `message`), but the underlying mutation has been corrected to
    match the schema's `CreatedApiKey` payload.
  - `workflows_update_config` is split into a mutation followed by a
    follow-up `workflowConfig` read because `UpdateWorkflowConfigPayload`
    only exposes `success`/`clientMutationId`. The tool no longer accepts
    `show_in_privacy_center`; the GraphQL API does not expose that field.
  - `inventory_list_data_silos` no longer requests `DataSilo.updatedAt`
    (not present on the type).

  Tool input parameter renames (BREAKING — every tool input is now
  camelCase). Tool _names_ are unchanged. The full list of renamed fields:
  - `assessment_id` → `assessmentId`
  - `assessment_section_ids` → `assessmentSectionIds`
  - `assessment_question_id` → `assessmentQuestionId`
  - `assessment_answer_ids` → `assessmentAnswerIds`
  - `assessment_answer_values` → `assessmentAnswerValues`
  - `assessment_group_id` → `assessmentGroupId`
  - `assessment_name` → `assessmentName`
  - `template_id` → `templateId`
  - `reviewer_ids` → `reviewerIds`
  - `due_date` → `dueDate`
  - `assignee_ids` → `assigneeIds`
  - `assignee_emails` → `assigneeEmails`
  - `external_assignee_emails` → `externalAssigneeEmails`
  - `submit_for_review` → `submitForReview`
  - `tracking_purposes` → `trackingPurposes`
  - `is_junk` → `isJunk`
  - `data_flows` → `dataFlows`
  - `show_zero_activity` → `showZeroActivity`
  - `order_field` → `orderField`
  - `order_direction` → `orderDirection`
  - `data_silo_id` → `dataSiloId`
  - `data_point_id` → `dataPointId`
  - `scan_id` → `scanId`
  - `entity_types` → `entityTypes`
  - `request_id` → `requestId`
  - `profile_ids` → `profileIds`
  - `data_silos` → `dataSilos` (admin_create_api_key)
  - `workflow_config_id` → `workflowConfigId`
  - `user_id` → `userId`
  - `show_in_privacy_center` (removed; not in schema)

  Removed tools:
  - `discovery_start_scan` and `discovery_get_scan` are removed. They called
    `startClassificationScan` / `classificationScan(id:)`, which do not exist
    in Transcend's GraphQL schema, so they could only ever fail at runtime.

  `defineTool` now recursively rejects any input field (at any nesting depth)
  that is missing a meaningful Zod description, and a repo-wide
  `scripts/check-mcp-descriptions.test.ts` audit enforces the same in CI.

### Patch Changes

- d00a847: Integrates mcp packages with oauth flow
- Updated dependencies [f04564e]
- Updated dependencies [b4b7c81]
- Updated dependencies [20e0336]
- Updated dependencies [b1d1f0b]
- Updated dependencies [8240631]
- Updated dependencies [d00a847]
- Updated dependencies [6a48672]
- Updated dependencies [6a48672]
  - @transcend-io/mcp-server-base@0.5.0
  - @transcend-io/sdk@1.2.10

## 0.3.6

### Patch Changes

- Updated dependencies [0da7015]
  - @transcend-io/privacy-types@5.3.2
  - @transcend-io/sdk@1.2.9

## 0.3.5

### Patch Changes

- Updated dependencies [0ae4785]
  - @transcend-io/privacy-types@5.3.1
  - @transcend-io/sdk@1.2.8

## 0.3.4

### Patch Changes

- Updated dependencies [6d56588]
  - @transcend-io/privacy-types@5.3.0
  - @transcend-io/sdk@1.2.7

## 0.3.3

### Patch Changes

- Updated dependencies [4ba5bfb]
  - @transcend-io/privacy-types@5.2.5
  - @transcend-io/sdk@1.2.6

## 0.3.2

### Patch Changes

- Updated dependencies [0e20155]
  - @transcend-io/privacy-types@5.2.4
  - @transcend-io/sdk@1.2.5

## 0.3.1

### Patch Changes

- @transcend-io/privacy-types@5.2.3
- @transcend-io/sdk@1.2.4

## 0.3.0

### Minor Changes

- c14ba60: Add consent analytics MCP tools (`consent_get_aggregate_analytics`, `consent_get_timeseries_analytics`, `consent_get_analytics_data`) backed by new SDK airgap bundle analytics fetchers and consent analytics enums in privacy-types. Rename `consent_get_triage_stats` to `consent_get_inventory_stats` to clarify it returns inventory counts, not site analytics.

### Patch Changes

- Updated dependencies [c14ba60]
  - @transcend-io/privacy-types@5.2.2
  - @transcend-io/sdk@1.2.3

## 0.2.16

### Patch Changes

- Updated dependencies [3741ca3]
  - @transcend-io/privacy-types@5.2.1
  - @transcend-io/sdk@1.2.2

## 0.2.15

### Patch Changes

- Updated dependencies [bf944ab]
- Updated dependencies [5538d24]
  - @transcend-io/privacy-types@5.2.0
  - @transcend-io/sdk@1.2.1

## 0.2.14

### Patch Changes

- Updated dependencies [14459f8]
  - @transcend-io/sdk@1.2.0

## 0.2.13

### Patch Changes

- Updated dependencies [b90b468]
- Updated dependencies [85f24d0]
  - @transcend-io/privacy-types@5.1.8
  - @transcend-io/mcp-server-base@0.4.5
  - @transcend-io/sdk@1.1.11

## 0.2.12

### Patch Changes

- Updated dependencies [b18f2e8]
- Updated dependencies [9d180f4]
  - @transcend-io/privacy-types@5.1.7
  - @transcend-io/sdk@1.1.10

## 0.2.11

### Patch Changes

- Updated dependencies [467109b]
  - @transcend-io/mcp-server-base@0.4.4

## 0.2.10

### Patch Changes

- ed322d2: Adjust readme to clarify api key requirements
- Updated dependencies [ed322d2]
  - @transcend-io/mcp-server-base@0.4.3
  - @transcend-io/sdk@1.1.9

## 0.2.9

### Patch Changes

- @transcend-io/sdk@1.1.8

## 0.2.8

### Patch Changes

- @transcend-io/sdk@1.1.7

## 0.2.7

### Patch Changes

- Updated dependencies [a9634e4]
  - @transcend-io/mcp-server-base@0.4.2

## 0.2.6

### Patch Changes

- Updated dependencies [a33cfa5]
- Updated dependencies [a33cfa5]
  - @transcend-io/mcp-server-base@0.4.1

## 0.2.5

### Patch Changes

- Updated dependencies [bf7e43d]
  - @transcend-io/privacy-types@5.1.6
  - @transcend-io/sdk@1.1.6

## 0.2.4

### Patch Changes

- @transcend-io/sdk@1.1.5

## 0.2.3

### Patch Changes

- @transcend-io/privacy-types@5.1.5
- @transcend-io/sdk@1.1.4

## 0.2.2

### Patch Changes

- 270f4f2: While this is not intended as a functional change, we’ve migrated GitHub repositories and build tooling
- Updated dependencies [270f4f2]
- Updated dependencies [d2822d5]
  - @transcend-io/sdk@1.1.3
  - @transcend-io/mcp-server-base@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies [041d5f9]
  - @transcend-io/privacy-types@5.1.4
  - @transcend-io/sdk@1.1.2

## 0.2.0

### Minor Changes

- af70fbf: Align MCP env var naming with the rest of the repo.
  - `TRANSCEND_API_URL` now points at the GraphQL backend (default `https://api.transcend.io`), matching `@transcend-io/cli` and the convention used throughout `transcend-io/main`.
  - The Sombra REST endpoint moves to `SOMBRA_URL` (default `https://multi-tenant.sombra.transcend.io`), matching the env var already read by `@transcend-io/cli` and `@transcend-io/sdk` (`createSombraGotInstance`). Setting `SOMBRA_URL` once now applies to both the CLI/SDK and the MCP server.
  - `TRANSCEND_GRAPHQL_URL` is removed.

  **Breaking:**
  - Anyone who previously set `TRANSCEND_API_URL` to a Sombra URL must rename it to `SOMBRA_URL`.
  - Anyone who previously set `TRANSCEND_GRAPHQL_URL` must rename it to `TRANSCEND_API_URL`.

### Patch Changes

- Updated dependencies [af70fbf]
- Updated dependencies [d5d6170]
  - @transcend-io/mcp-server-base@0.3.0
  - @transcend-io/sdk@1.1.1

## 0.1.3

### Patch Changes

- Updated dependencies [18b4321]
  - @transcend-io/sdk@1.1.0

## 0.1.2

### Patch Changes

- 9d2a663: Update for mcp packages to consume new package names for previously name mcp-server, mcp-server-assessments, and mcp-server-core
- Updated dependencies [f0e7400]
- Updated dependencies [d6c7dbf]
- Updated dependencies [9d2a663]
  - @transcend-io/privacy-types@5.1.3
  - @transcend-io/sdk@1.0.3
  - @transcend-io/mcp-server-base@0.2.0

## 1.0.2

### Patch Changes

- @transcend-io/privacy-types@5.1.2
- @transcend-io/sdk@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [ebc2e91]
- Updated dependencies [8984fb5]
  - @transcend-io/privacy-types@5.1.1
  - @transcend-io/sdk@1.0.1

## 1.0.0

### Major Changes

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

### Patch Changes

- d3f8140: fix: remove unsupported pageInfo from consent GQL queries and unused filterBy from stats queries
- 29868af: refactor: deduplicate enums and replace inline strings with shared privacy-types

  Add CookieOrderField, DataFlowOrderField, DataFlowType, TriageAction, and ConsentTrackerType enums to privacy-types. Replace z.string() tool params with proper enum types (ScopeName, AssessmentFormTemplateStatus). Enrich admin_create_api_key with TRANSCEND_SCOPES metadata.

- Updated dependencies [a15fed8]
- Updated dependencies [8185679]
- Updated dependencies [d3f8140]
- Updated dependencies [29868af]
- Updated dependencies [6f2a059]
- Updated dependencies [f7a5c54]
- Updated dependencies [00b9d23]
- Updated dependencies [896364c]
  - @transcend-io/sdk@1.0.0
  - @transcend-io/privacy-types@5.1.0
  - @transcend-io/mcp-server-core@0.1.0
