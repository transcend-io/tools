# @transcend-io/mcp-server-dsr

## 0.4.8

### Patch Changes

- Updated dependencies [259151f]
  - @transcend-io/privacy-types@5.8.2

## 0.4.7

### Patch Changes

- Updated dependencies [ccb3c45]
  - @transcend-io/privacy-types@5.8.1

## 0.4.6

### Patch Changes

- Updated dependencies [b1750a6]
  - @transcend-io/privacy-types@5.8.0

## 0.4.5

### Patch Changes

- Updated dependencies [2355c9e]
  - @transcend-io/privacy-types@5.7.0

## 0.4.4

### Patch Changes

- Updated dependencies [89f4fe5]
  - @transcend-io/privacy-types@5.6.0

## 0.4.3

### Patch Changes

- cbe9d3a: Update links in the readmes
- Updated dependencies [cbe9d3a]
- Updated dependencies [b0c9656]
  - @transcend-io/mcp-server-base@0.6.1
  - @transcend-io/privacy-types@5.5.0

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
  - @transcend-io/mcp-server-base@0.5.0

## 0.3.20

### Patch Changes

- Updated dependencies [0da7015]
  - @transcend-io/privacy-types@5.3.2

## 0.3.19

### Patch Changes

- Updated dependencies [0ae4785]
  - @transcend-io/privacy-types@5.3.1

## 0.3.18

### Patch Changes

- Updated dependencies [6d56588]
  - @transcend-io/privacy-types@5.3.0

## 0.3.17

### Patch Changes

- Updated dependencies [4ba5bfb]
  - @transcend-io/privacy-types@5.2.5

## 0.3.16

### Patch Changes

- Updated dependencies [0e20155]
  - @transcend-io/privacy-types@5.2.4

## 0.3.15

### Patch Changes

- @transcend-io/privacy-types@5.2.3

## 0.3.14

### Patch Changes

- Updated dependencies [c14ba60]
  - @transcend-io/privacy-types@5.2.2

## 0.3.13

### Patch Changes

- Updated dependencies [3741ca3]
  - @transcend-io/privacy-types@5.2.1

## 0.3.12

### Patch Changes

- Updated dependencies [bf944ab]
- Updated dependencies [5538d24]
  - @transcend-io/privacy-types@5.2.0

## 0.3.11

### Patch Changes

- Updated dependencies [b90b468]
- Updated dependencies [85f24d0]
  - @transcend-io/privacy-types@5.1.8
  - @transcend-io/mcp-server-base@0.4.5

## 0.3.10

### Patch Changes

- Updated dependencies [b18f2e8]
  - @transcend-io/privacy-types@5.1.7

## 0.3.9

### Patch Changes

- 467109b: Return canonical `app.transcend.io` deep links from assessment tools so MCP
  clients (Claude Desktop, Cursor, etc.) stop fabricating 404 URLs like
  `/privacy-requests/assessments/:id`.
  - `assessments_create`, `assessments_get`, `assessments_update`,
    `assessments_submit_response`, and `assessments_list` now include a single
    `url` field in their result payloads, always pointing at the form's
    read-only response page (`/assessments/forms/{id}/response`) — the same
    destination as the dashboard's "View Responses" row action, which works
    for any user with assessment view scope.
  - `assessments_create_group` and `assessments_list_groups` include a
    `groupUrl` (`/assessments/groups/{id}`).
  - Per-assessment tools intentionally do **not** return `groupUrl` as a
    sibling of `url`. When both were exposed, downstream LLM clients reliably
    surfaced `groupUrl` over `url` and every clicked link ended up at the
    parent group instead of the specific assessment. Group navigation lives
    on the dedicated group tools above.
  - The fillable `/assessments/forms/{id}/view` route is also intentionally
    not surfaced — it 404s for anyone who isn't the form's assignee, which
    the MCP can't verify.
  - Tool `description`s now instruct the model to surface the returned `url`
    / `groupUrl` verbatim instead of constructing URLs from raw IDs.
  - `ToolClients` gains a `dashboardUrl` field (always
    `https://app.transcend.io` in production) plus a new
    `DEFAULT_DASHBOARD_URL` export from `@transcend-io/mcp-server-base`.
  - New optional `TRANSCEND_DASHBOARD_URL` env var overrides the dashboard
    base URL for testing against staging or local dashboards. Unset in
    production so we fall through to the canonical `app.transcend.io`.
  - `assessmentGroupId` is now surfaced on the `Assessment` type via the
    underlying GraphQL queries, so callers can still navigate from a specific
    assessment to its parent group via the group tools.
  - Standalone server CLIs (`mcp-server-admin`, `mcp-server-discovery`,
    `mcp-server-dsr`, `mcp-server-inventory`, `mcp-server-preferences`,
    `mcp-server-workflows`) were updated to accept the new `dashboardUrl`
    field on `CreateClientsArgs`. Runtime behavior is unchanged for everything
    except the assessment server, which now uses it to build deep links.

  Fixes ZEL-7538.

- Updated dependencies [467109b]
  - @transcend-io/mcp-server-base@0.4.4

## 0.3.8

### Patch Changes

- ed322d2: Adjust readme to clarify api key requirements
- Updated dependencies [ed322d2]
  - @transcend-io/mcp-server-base@0.4.3

## 0.3.7

### Patch Changes

- 3cb3a63: Rename `dsr_employee_submit` tool to `dsr_submit_on_behalf` to clarify that the
  distinction from `dsr_submit` is about the caller (admin filing on behalf of a
  data subject), not the data subject's `subjectType`. The exported schema and
  type are renamed accordingly (`submitDsrOnBehalfSchema`,
  `SubmitDsrOnBehalfInput`), and both tool descriptions cross-reference each
  other.

  Also tightens `dsr_analyze`'s description to spell out exactly what it returns
  (counts by type and status, completion rate, configurable recent-days window)
  and when to reach for `dsr_list` instead.

## 0.3.6

### Patch Changes

- Updated dependencies [a9634e4]
  - @transcend-io/mcp-server-base@0.4.2

## 0.3.5

### Patch Changes

- Updated dependencies [a33cfa5]
- Updated dependencies [a33cfa5]
  - @transcend-io/mcp-server-base@0.4.1

## 0.3.4

### Patch Changes

- Updated dependencies [bf7e43d]
  - @transcend-io/privacy-types@5.1.6

## 0.3.3

### Patch Changes

- @transcend-io/privacy-types@5.1.5

## 0.3.2

### Patch Changes

- Updated dependencies [d2822d5]
  - @transcend-io/mcp-server-base@0.4.0

## 0.3.1

### Patch Changes

- Updated dependencies [041d5f9]
  - @transcend-io/privacy-types@5.1.4

## 0.3.0

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
  - @transcend-io/mcp-server-base@0.3.0

## 0.2.0

### Minor Changes

- d6c7dbf: Add Streamable HTTP transport and dual-auth support (API key + session cookie) to all MCP server packages.

  **Breaking (core):** `TranscendGraphQLBase` and `TranscendRestClient` constructors now accept `AuthCredentials | null` instead of a plain API key string. `createMCPServer`'s `createClients` callback receives `AuthCredentials | null` as its first argument.

  **New:**
  - `--transport http` flag starts an Express-based Streamable HTTP server with per-session isolation
  - `AuthCredentials` discriminated union (`apiKey` | `sessionCookie`) for outbound request authentication
  - `AsyncLocalStorage`-based per-request auth context (`requestAuthContext` / `getRequestAuth`) for safe concurrent multi-tenant operation
  - `resolveAuth` / `tryResolveAuth` for resolving credentials from inbound HTTP headers or env var
  - `buildMcpServer` lower-level factory for creating `Server` instances without transport
  - `runMcpHttp` for starting HTTP servers with session management, SSE resume, health check, and CORS
  - Auth-free initialization for sidecar deployments (Prometheus/Mastra pattern)

### Patch Changes

- 9d2a663: Update for mcp packages to consume new package names for previously name mcp-server, mcp-server-assessments, and mcp-server-core
- Updated dependencies [f0e7400]
- Updated dependencies [d6c7dbf]
- Updated dependencies [9d2a663]
  - @transcend-io/privacy-types@5.1.3
  - @transcend-io/mcp-server-base@0.2.0

## 0.0.3

### Patch Changes

- @transcend-io/privacy-types@5.1.2

## 0.0.2

### Patch Changes

- Updated dependencies [ebc2e91]
- Updated dependencies [8984fb5]
  - @transcend-io/privacy-types@5.1.1

## 0.0.1

### Patch Changes

- 29868af: refactor: deduplicate enums and replace inline strings with shared privacy-types

  Add CookieOrderField, DataFlowOrderField, DataFlowType, TriageAction, and ConsentTrackerType enums to privacy-types. Replace z.string() tool params with proper enum types (ScopeName, AssessmentFormTemplateStatus). Enrich admin_create_api_key with TRANSCEND_SCOPES metadata.

- Updated dependencies [a15fed8]
- Updated dependencies [8185679]
- Updated dependencies [29868af]
  - @transcend-io/privacy-types@5.1.0
  - @transcend-io/mcp-server-core@0.1.0
