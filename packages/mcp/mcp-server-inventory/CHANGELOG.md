# @transcend-io/mcp-server-inventory

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
