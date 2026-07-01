# @transcend-io/mcp-server-base

## 0.5.0

### Minor Changes

- 8240631: Updates docs to direct users in integrating mcp with oauth
- 6a48672: Add GraphQL Code Generator foundation and supporting utilities.
  - `TranscendGraphQLBase.makeRequest` now accepts a `TypedDocumentNode` in
    addition to a string query. When passed a typed document, the result is
    inferred from the node's variable/result types so callers get end-to-end
    type safety against the staging schema.
  - New `CursorPaginationSchema` and `OffsetPaginationSchema` are exported
    for tools that mirror the two pagination styles Transcend's GraphQL API
    uses. The legacy combined `PaginationSchema` is now deprecated; prefer
    the cursor/offset variants.
  - `defineTool` now recursively validates that every input field (at any
    nesting depth) carries a non-empty Zod description, throwing at tool
    construction otherwise. The reusable `collectMissingDescriptions` helper
    backs both this check and the repo-wide audit test.

### Patch Changes

- f04564e: Adds plumping for oauth token exchange to the transcend platform
- b4b7c81: Adds structure for lazy oauth handling on tool calls
- 20e0336: Adds foundations for oauth infrastructure
- b1d1f0b: Adds oauth flow to browser and callback html
- d00a847: Integrates mcp packages with oauth flow

## Unreleased

### Patch Changes

- OAuth callback timeouts are now non-retryable and return an agent-facing message instructing the agent to report the timeout and wait for a new user message.
- OAuth stdio tokens are **session-only**: access and refresh tokens are kept in process memory and are not written to disk. Restarting the MCP client (or MCP server process) requires signing in again. Expired access tokens are still refreshed silently within the same process when a refresh token is available.
- Added stdio OAuth login (browser consent on first tool use). OAuth mode is opt-in: it activates only when `TRANSCEND_OAUTH_CLIENT_ID` is set and `TRANSCEND_API_KEY` is not. Existing API key auth is unchanged.
- When OAuth mode is enabled, startup requires `TRANSCEND_OAUTH_CLIENT_ID`, `TRANSCEND_OAUTH_CLIENT_SECRET`, and `TRANSCEND_OAUTH_REDIRECT_PORT`. Credentials are verified via `POST {issuer}/oauth/client-verify` (`{ client_id, client_secret, redirect_uri }` → `{ isValid: boolean }`). Register redirect URI `http://127.0.0.1:{port}/callback` on the OAuth client to match `TRANSCEND_OAUTH_REDIRECT_PORT`. Added `verifyOAuthClientCredentials` export.
- Added `TRANSCEND_OAUTH_REDIRECT_HOST` for OAuth stdio callback loopback address (`127.0.0.1` default, or `::1` for `http://[::1]:{port}/callback`). Startup verification, authorize, token exchange, and the callback server all use the configured host.

## 0.4.5

### Patch Changes

- 85f24d0: Fix hardcoded pagination limits in `inventory_analyze`. The tool previously fetched only the first 100 data silos, vendors, identifiers, and categories and reported those capped array lengths as the totals, silently undercounting larger inventories. It now fully paginates all of these entities. This also fixes latent gaps where `liveDataSilos`, the outer-type breakdown, and identifier `isRequired` were always empty because those fields were never selected.

  Pagination is centralized in a new `TranscendGraphQLBase.fetchAllPages()` helper that walks an offset-paginated `{ nodes, totalCount }` connection through the existing `makeRequest`. Every page therefore inherits the same behaviour as all other MCP GraphQL calls — per-request auth (stdio static API key / HTTP per-request session cookie), the proactive rate-limit throttle, request timeout, retry with backoff, and `ToolError`/`ErrorCode` classification — and the loop terminates on `offset >= totalCount`, which also guards against a backend that ignores `offset`. `ListOptions` gains an `all?: boolean` flag: `list*({ all: true })` returns the full result set via `fetchAllPages`, and `inventory_analyze` uses it instead of bespoke fetch-all queries. The `inventory_list_data_silos` and `inventory_list_identifiers` payloads now also include `isLive`/`outerType` and `isRequiredInForm` respectively.

  Also fix broken pagination in the `inventory_list_*` tools (`data_silos`, `vendors`, `identifiers`, `data_points`, `categories`). They previously accepted a `cursor` that was silently ignored by the underlying queries, so every page returned the same first 100 results. They now use numeric `offset` pagination (matching `inventory_list_sub_data_points` and the consent list tools), with `hasNextPage` derived from `offset + page length < totalCount`.

## 0.4.4

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

## 0.4.3

### Patch Changes

- ed322d2: Adjust readme to clarify api key requirements

## 0.4.2

### Patch Changes

- a9634e4: Properly forwards mcp-caller header from requests to tool calls

## 0.4.1

### Patch Changes

- a33cfa5: Adds user agent and toolcall headers mcp tool calls
- a33cfa5: Adds x-transcend-mcp-caller to allowed headers

## 0.4.0

### Minor Changes

- d2822d5: Stop Datadog (and other container log collectors that key off the stream) from tagging every MCP info log as Error. `SimpleLogger` previously wrote all log levels to stderr unconditionally; in HTTP transport that meant routine lines like `Executing tool: ...`, `Returning N tools`, and `HTTP server listening` were classified as `Error` in Datadog despite the JSON `level` field saying `info`.

  `SimpleLogger` now exposes a static `setInfoToStdout(enabled)` configuration. When enabled (called automatically for HTTP transport in `createMCPServer` and the unified `mcp` CLI), `info` and `debug` route to `process.stdout` while `warn` and `error` stay on `process.stderr`. The default remains all-stderr so stdio MCP transport keeps working without polluting the JSON-RPC protocol on stdout.

  Also:
  - The duplicate-tool-name warning in `ToolRegistry` now goes through `SimpleLogger.warn` instead of bypassing it with a direct `process.stderr.write`, so it benefits from the same routing config and emits structured JSON consistent with the rest of the server's logs.
  - `SimpleLogger` keeps strict `(message: string, data?: unknown)` method signatures for compile-time safety on direct callers, while satisfying a wider variadic `Logger` interface (structurally identical to the one in `@transcend-io/utils`) via TypeScript's method bivariance. No new runtime dependencies introduced.

## 0.3.0

### Minor Changes

- af70fbf: Align MCP env var naming with the rest of the repo.
  - `TRANSCEND_API_URL` now points at the GraphQL backend (default `https://api.transcend.io`), matching `@transcend-io/cli` and the convention used throughout `transcend-io/main`.
  - The Sombra REST endpoint moves to `SOMBRA_URL` (default `https://multi-tenant.sombra.transcend.io`), matching the env var already read by `@transcend-io/cli` and `@transcend-io/sdk` (`createSombraGotInstance`). Setting `SOMBRA_URL` once now applies to both the CLI/SDK and the MCP server.
  - `TRANSCEND_GRAPHQL_URL` is removed.

  **Breaking:**
  - Anyone who previously set `TRANSCEND_API_URL` to a Sombra URL must rename it to `SOMBRA_URL`.
  - Anyone who previously set `TRANSCEND_GRAPHQL_URL` must rename it to `TRANSCEND_API_URL`.

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

## 0.1.0

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
