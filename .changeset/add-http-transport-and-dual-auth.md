---
"@transcend-io/mcp-server-base": minor
"@transcend-io/mcp": minor
"@transcend-io/mcp-server-admin": minor
"@transcend-io/mcp-server-assessments": minor
"@transcend-io/mcp-server-discovery": minor
"@transcend-io/mcp-server-dsr": minor
"@transcend-io/mcp-server-inventory": minor
"@transcend-io/mcp-server-preferences": minor
"@transcend-io/mcp-server-workflows": minor
---

Add Streamable HTTP transport and dual-auth support (API key + session cookie) to all MCP server packages.

**Breaking (core):** `TranscendGraphQLBase` and `TranscendRestClient` constructors now accept `AuthCredentials | null` instead of a plain API key string. `createMCPServer`'s `createClients` callback receives `AuthCredentials | null` as its first argument.

**New:**
- `--transport http` flag starts an Express-based Streamable HTTP server with per-session isolation
- `AuthCredentials` discriminated union (`apiKey` | `sessionCookie`) for outbound request authentication
- `AsyncLocalStorage`-based per-request auth context (`requestAuthContext` / `getRequestAuth`) for safe concurrent multi-tenant operation
- `resolveAuth` / `tryResolveAuth` for resolving credentials from inbound HTTP headers or env var
- `buildMcpServer` lower-level factory for creating `Server` instances without transport
- `runMcpHttp` for starting HTTP servers with session management, SSE resume, health check, and CORS
- Auth-free initialization for sidecar deployments (Prometheus/Mastra pattern)
