# @transcend-io/mcp-server-consent

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
