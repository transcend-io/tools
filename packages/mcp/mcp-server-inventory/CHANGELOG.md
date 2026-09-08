# @transcend-io/mcp-server-inventory

## 1.0.0

### Major Changes

- 7e7d797: Consolidate every paginated tool onto two schemas, fix a `hasNextPage` bug that made
  agents page forever, and give eight tools the paging they never had.

  Pagination had drifted into three shared schemas and fourteen inline copies across 27
  tools, producing four caller-facing conventions. `PaginationSchema` was marked deprecated
  yet had eight users; `CursorPaginationSchema`, marked preferred, had none — not even
  `dsr_list`, the one tool that genuinely pages by cursor.

  Checking the GraphQL schema settled what shapes are actually needed. Of the list fields
  the MCP servers query, 24 accept `first`/`offset` and return `nodes` plus `totalCount`
  with no `pageInfo`; exactly one, `requests`, accepts `after` and returns a real
  `pageInfo.endCursor`. So there are two shapes, and `CursorPaginationSchema` is for the
  rare case rather than the default. Both now expose `limit` — 22 of 27 tools already used
  that name, and `first` is the GraphQL wire name, which mixins map internally so Relay
  vocabulary never reaches callers. `PaginationSchema` is deleted.

  Because almost no payload carries a `pageInfo`, every mixin synthesized one, and they
  disagreed. Eight wrote `nodeCount < totalCount`, which ignores where the page starts: on
  the last page 20 rows against a total of 120 still compares true, so `hasNextPage` never
  went false. An agent told to page until it did would loop until it exhausted its context.
  That affected `assessments_list`, `assessments_list_groups`, `assessments_list_templates`,
  `workflows_list`, `workflows_list_email_templates`, `admin_list_teams`,
  `admin_list_api_keys` and `discovery_list_scans`. A shared `derivePageInfo` helper in
  `mcp-server-base` now owns the comparison, and every offset-paginated mixin routes
  through it.

  Eight tools returned `hasNextPage: true` with no continuation parameter at all, because
  their query documents never declared the `$offset` the schema has always accepted —
  `ListApiKeysDoc` twelve lines below `ListTeamsDoc` declares it correctly. `admin_list_teams`,
  `workflows_list`, `consent_list_purposes`, `discovery_list_scans`, `discovery_list_plugins`,
  `assessments_list`, `assessments_list_groups` and `assessments_list_templates` now page.
  This adds `$offset` to the shared `TranscendCliPurposes` query in the SDK, which is
  backward compatible: the argument is optional and existing CLI callers are unaffected.

  Tools renamed from `first` to `limit`: `dsr_list_identifiers`,
  `dsr_list_request_data_silos`, `consent_list_cookies`, `consent_list_data_flows` and
  `inventory_list_categories`. Nine tools drop a `cursor` parameter that was never wired to
  anything. `preferences_query` keeps `limit`/`cursor` but not the shared bound, since its
  REST endpoint caps a page at 50 rather than 100.

  Descriptions no longer explain how to paginate — "Paginate with `offset` until
  `hasNextPage` is false", "max 100", "Note: cursor pagination is not supported". The schema
  already carries the bounds, defaults and parameter names, so that prose was spending
  `tools/list` budget on every call to restate machine-readable facts. Removing it more than
  paid for the eight tools that gained `offset`: the paginated surface costs 1,473 characters
  less than on main, and the payload as a whole drops from 82,531 to 76,794 characters once
  the per-schema `$schema` pointer goes too.

  A new contract test asserts across the whole registry that no tool exposes `first` or
  `after`, that no tool caps with `limit` without offering a continuation parameter, that
  `limit` is bounded identically everywhere, and that descriptions do not restate paging
  mechanics — plus unit coverage pinning the `derivePageInfo` termination cases.

  Every paginated tool was also driven against a real org by hand while developing this
  change, checking that each page is no larger than `limit`, that the continuation parameter
  advances, that the last page reports `hasNextPage: false`, and that an offset past the end
  does not promise another page. Of the 27 paginated tools, 25 pass every check,
  `dsr_list_identifiers` has no rows in that org, and `preferences_query` needs a partition
  no list call can supply. That probe was a throwaway harness rather than a committed test,
  so nothing in the suite points at a live environment.

  It caught something the mocked tests could not: `consent_list_regimes` returned four
  rows for `limit: 3`. Probing the API directly showed `experiences` answers `first: n` with
  `n + 1` rows at every size, and the tool forwarded that verbatim, so `limit` was a lie and
  offset paging double-counted the seam. It now trims to `limit`, which keeps paging gapless
  because the extra row is the one the next offset starts on.

  The two `discovery_*` tools remain built on `dataSilos` and synthesize their rows, so
  `discovery_list_scans` reports a hardcoded `COMPLETED` status and `discovery_list_plugins`
  derives integration types per page. Their descriptions now say so rather than overclaiming;
  repointing them at the real `discoClassScans` and `plugins` fields is follow-up work.

### Patch Changes

- Updated dependencies [7e7d797]
- Updated dependencies [7e7d797]
  - @transcend-io/mcp-server-base@1.9.0

## 0.7.10

### Patch Changes

- Updated dependencies [bccab7e]
- Updated dependencies [a19b07e]
  - @transcend-io/mcp-server-base@1.8.1
  - @transcend-io/privacy-types@5.26.0

## 0.7.9

### Patch Changes

- Updated dependencies [ff0204c]
  - @transcend-io/privacy-types@5.25.0

## 0.7.8

### Patch Changes

- 2a6a955: Fixes a lot of Sombra tools
- Updated dependencies [2a6a955]
- Updated dependencies [557a80b]
  - @transcend-io/mcp-server-base@1.8.0

## 0.7.7

### Patch Changes

- Updated dependencies [5b97f8e]
  - @transcend-io/mcp-server-base@1.7.4

## 0.7.6

### Patch Changes

- Updated dependencies [ef34d80]
  - @transcend-io/mcp-server-base@1.7.3

## 0.7.5

### Patch Changes

- Updated dependencies [656903e]
  - @transcend-io/mcp-server-base@1.7.2

## 0.7.4

### Patch Changes

- Updated dependencies [7d1d57c]
  - @transcend-io/privacy-types@5.24.0

## 0.7.3

### Patch Changes

- Updated dependencies [4aa92a1]
  - @transcend-io/mcp-server-base@1.7.1

## 0.7.2

### Patch Changes

- Updated dependencies [ea1ab3c]
  - @transcend-io/privacy-types@5.23.0

## 0.7.1

### Patch Changes

- Updated dependencies [732e769]
  - @transcend-io/mcp-server-base@1.7.0

## 0.7.0

### Minor Changes

- 2b82ee8: Add `inventory_write_category` to create or update Data Inventory data subcategories (ZEL-8169). Enrich `inventory_list_categories` to query `dataSubCategories` with ids, owners, teams, and optional text search.
- bd397d4: Add `inventory_write_data_silo` to create or update data systems in one MCP call (ZEL-8221). Create-by-integrationName always creates a new silo; update-by-id applies metadata without title upsert. Replaces `inventory_create_data_silo` and `inventory_update_data_silo`.

### Patch Changes

- d00bd92: `inventory_create_data_silo` now annotates `destructiveHint: false`. It adds a data-map entry and touches nothing existing, which is what the MCP spec calls an additive update; the previous `true` read as "this writes" rather than "this destroys". The neighbouring `inventory_update_data_silo` — which does overwrite existing metadata — was already `false`, so the pair had the asymmetry backwards.

  Hosts use `destructiveHint` to decide how loudly to warn before a call, so labelling a harmless create as destructive trains people to click through warnings and cheapens them on the tools that need them.

- bb8e59b: Simplify `writeDataSilo` field handling with rest destructuring (follow-up to #449).
- Updated dependencies [d00bd92]
- Updated dependencies [6c6ea93]
- Updated dependencies [2b82ee8]
- Updated dependencies [bd397d4]
- Updated dependencies [1f72e6a]
- Updated dependencies [6a09b61]
  - @transcend-io/mcp-server-base@1.6.0
  - @transcend-io/privacy-types@5.22.0

## 0.6.8

### Patch Changes

- Updated dependencies [9032822]
  - @transcend-io/mcp-server-base@1.5.0

## 0.6.7

### Patch Changes

- Updated dependencies [c8df618]
- Updated dependencies [9637490]
  - @transcend-io/mcp-server-base@1.4.0
  - @transcend-io/privacy-types@5.20.0

## 0.6.6

### Patch Changes

- Updated dependencies [98eeb1d]
  - @transcend-io/privacy-types@5.19.0
  - @transcend-io/mcp-server-base@1.3.1

## 0.6.5

### Patch Changes

- Updated dependencies [5819bc1]
- Updated dependencies [c787e9d]
  - @transcend-io/mcp-server-base@1.3.0

## 0.6.4

### Patch Changes

- Updated dependencies [4404c48]
- Updated dependencies [c198439]
- Updated dependencies [60f2200]
- Updated dependencies [7d980a1]
  - @transcend-io/mcp-server-base@1.2.0
  - @transcend-io/privacy-types@5.18.0

## 0.6.3

### Patch Changes

- 26fadc4: Remove the `confirmationHint` field and its remaining call-site strings. #407 removed it from 25 tools; nine occurrences have re-appeared since (three in the platform interfaces and six in inventory / consent / dsr feature PRs). No code reads the field, so this is dead metadata. The upcoming confirmation-gate work introduces a separate `confirmation: { hint }` field with a semantic contract — deleting the old one first keeps that landing focused on adding the new API.
- Updated dependencies [26fadc4]
  - @transcend-io/mcp-server-base@1.1.1

## 0.6.2

### Patch Changes

- Updated dependencies [2bc0cb2]
  - @transcend-io/privacy-types@5.17.0

## 0.6.1

### Patch Changes

- Updated dependencies [3aab830]
  - @transcend-io/privacy-types@5.16.0

## 0.6.0

### Minor Changes

- 2faaff6: Add `inventory_update_or_create_data_point` for field-level purpose of processing assignments (ZEL-8168).
- 5b239dc: Improve inventory MCP DX: split data-silo create into catalog `integrationName` + optional display `title`/`description`, add `text` (and silo `titles`) list filters, and stop fabricating datapoint timestamps.
- 5b239dc: Add `inventory_list_catalog_integrations` so agents can search the Transcend catalog for valid `integrationName` values before creating a data silo.
- 6293072: Add processing purpose list/write MCP tools and expand `inventory_update_data_silo` for Data Systems fields (ZEL-8168 stack).
- daffc18: Enrich inventory MCP read tools with silo vendor/purposes/owners metadata, datapoint filtering, vendor field detail, and subcategory normalization; add `inventory_list_business_entities` and `inventory_list_data_subjects` (ZEL-8168 stack PR1).
- dc9ab41: Add `inventory_write_vendor` MCP tool to create/update vendors in Data Inventory (ZEL-8168 stack).

### Patch Changes

- 5b239dc: Tool copy changes
- 5b239dc: Small type adjustment to Datapoint
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

## 0.5.10

### Patch Changes

- @transcend-io/mcp-server-base@1.0.0

## 0.5.9

### Patch Changes

- Updated dependencies [f6ca084]
- Updated dependencies [2cc726f]
- Updated dependencies [66e641e]
  - @transcend-io/mcp-server-base@0.14.0
  - @transcend-io/privacy-types@5.15.0

## 0.5.8

### Patch Changes

- Updated dependencies [8deab38]
  - @transcend-io/privacy-types@5.14.0

## 0.5.7

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

## 0.5.6

### Patch Changes

- Updated dependencies [1b93859]
- Updated dependencies [1b93859]
- Updated dependencies [1b93859]
- Updated dependencies [c166809]
- Updated dependencies [1b93859]
- Updated dependencies [188ba6f]
  - @transcend-io/mcp-server-base@0.12.0
  - @transcend-io/privacy-types@5.12.0

## 0.5.5

### Patch Changes

- Updated dependencies [6932df1]
- Updated dependencies [29e9d5f]
  - @transcend-io/mcp-server-base@0.11.0
  - @transcend-io/privacy-types@5.11.0

## 0.5.4

### Patch Changes

- Updated dependencies [e68d245]
  - @transcend-io/privacy-types@5.10.2

## 0.5.3

### Patch Changes

- Updated dependencies [841f1a9]
  - @transcend-io/privacy-types@5.10.1

## 0.5.2

### Patch Changes

- Updated dependencies [da3e443]
- Updated dependencies [8034d59]
- Updated dependencies [c00f3c5]
  - @transcend-io/privacy-types@5.10.0
  - @transcend-io/mcp-server-base@0.10.0

## 0.5.1

### Patch Changes

- Updated dependencies [8bfe3cc]
- Updated dependencies [c65d41e]
  - @transcend-io/privacy-types@5.9.1
  - @transcend-io/mcp-server-base@0.9.0

## 0.5.0

### Minor Changes

- 637b357: Enables sombra integration with mcp

### Patch Changes

- cf74715: enforce orgs mcp x sombra setting
- 29821b9: Adds condition sombra header and lazy load the customers sombra url
- fb24b96: Adds sombra metadata to tools
- Updated dependencies [cf74715]
- Updated dependencies [29821b9]
- Updated dependencies [fb24b96]
- Updated dependencies [637b357]
  - @transcend-io/mcp-server-base@0.8.0

## 0.4.13

### Patch Changes

- Updated dependencies [be15c28]
  - @transcend-io/privacy-types@5.9.0

## 0.4.12

### Patch Changes

- Updated dependencies [ac7537b]
  - @transcend-io/privacy-types@5.8.5

## 0.4.11

### Patch Changes

- Updated dependencies [54f4aff]
  - @transcend-io/privacy-types@5.8.4

## 0.4.10

### Patch Changes

- Updated dependencies [e410109]
  - @transcend-io/mcp-server-base@0.7.0

## 0.4.9

### Patch Changes

- Updated dependencies [3f41944]
  - @transcend-io/mcp-server-base@0.6.2

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

## 0.3.7

### Patch Changes

- ec9f959: Clarify pagination wording in the `inventory_list_data_silos` tool description.

## 0.3.6

### Patch Changes

- 85f24d0: Fix hardcoded pagination limits in `inventory_analyze`. The tool previously fetched only the first 100 data silos, vendors, identifiers, and categories and reported those capped array lengths as the totals, silently undercounting larger inventories. It now fully paginates all of these entities. This also fixes latent gaps where `liveDataSilos`, the outer-type breakdown, and identifier `isRequired` were always empty because those fields were never selected.

  Pagination is centralized in a new `TranscendGraphQLBase.fetchAllPages()` helper that walks an offset-paginated `{ nodes, totalCount }` connection through the existing `makeRequest`. Every page therefore inherits the same behaviour as all other MCP GraphQL calls — per-request auth (stdio static API key / HTTP per-request session cookie), the proactive rate-limit throttle, request timeout, retry with backoff, and `ToolError`/`ErrorCode` classification — and the loop terminates on `offset >= totalCount`, which also guards against a backend that ignores `offset`. `ListOptions` gains an `all?: boolean` flag: `list*({ all: true })` returns the full result set via `fetchAllPages`, and `inventory_analyze` uses it instead of bespoke fetch-all queries. The `inventory_list_data_silos` and `inventory_list_identifiers` payloads now also include `isLive`/`outerType` and `isRequiredInForm` respectively.

  Also fix broken pagination in the `inventory_list_*` tools (`data_silos`, `vendors`, `identifiers`, `data_points`, `categories`). They previously accepted a `cursor` that was silently ignored by the underlying queries, so every page returned the same first 100 results. They now use numeric `offset` pagination (matching `inventory_list_sub_data_points` and the consent list tools), with `hasNextPage` derived from `offset + page length < totalCount`.

- Updated dependencies [85f24d0]
  - @transcend-io/mcp-server-base@0.4.5

## 0.3.5

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

## 0.3.4

### Patch Changes

- ed322d2: Adjust readme to clarify api key requirements
- Updated dependencies [ed322d2]
  - @transcend-io/mcp-server-base@0.4.3

## 0.3.3

### Patch Changes

- Updated dependencies [a9634e4]
  - @transcend-io/mcp-server-base@0.4.2

## 0.3.2

### Patch Changes

- Updated dependencies [a33cfa5]
- Updated dependencies [a33cfa5]
  - @transcend-io/mcp-server-base@0.4.1

## 0.3.1

### Patch Changes

- Updated dependencies [d2822d5]
  - @transcend-io/mcp-server-base@0.4.0

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
- Updated dependencies [d6c7dbf]
- Updated dependencies [9d2a663]
  - @transcend-io/mcp-server-base@0.2.0

## 0.0.1

### Patch Changes

- Updated dependencies [8185679]
  - @transcend-io/mcp-server-core@0.1.0
