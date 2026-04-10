# ADR-001: Streamable HTTP Transport for Remote Hosting

**Status:** Accepted
**Date:** 2026-04-09
**Linear:** [LINK-5770](https://linear.app/transcend/issue/LINK-5770), [LINK-5827](https://linear.app/transcend/issue/LINK-5827)

## Context

The Transcend MCP servers shipped with stdio transport only, requiring each user to run a local Node.js process. This prevents remote hosting, imposes a "one process per user" constraint, and limits the MCP server to developer tooling rather than a platform capability that non-technical stakeholders can leverage.

The [MCP specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) defines Streamable HTTP as the recommended transport for remote servers, replacing the older HTTP+SSE transport from protocol version 2024-11-05. The `@modelcontextprotocol/sdk` 1.29+ includes `StreamableHTTPServerTransport` and `createMcpExpressApp` for Node.js servers.

## Decision

### Transport strategy

Add Streamable HTTP transport alongside stdio in the same binary, selected via `--transport http`. stdio remains the default for backward compatibility with local clients (Claude Desktop, Cursor, etc.).

### Session management: stateful with in-memory event store

Each HTTP client gets a dedicated MCP `Server` instance and `StreamableHTTPServerTransport`, identified by a `mcp-session-id` header. Sessions support resume within a configurable idle TTL via `InMemoryEventStore` for SSE event replay. A sweeper runs periodically to close expired sessions.

This is stateful per-process. Durable replay across restarts or multi-node load balancing requires a persistent `EventStore` implementation — deferred as a follow-up.

### API key resolution

stdio mode: `TRANSCEND_API_KEY` environment variable only (existing behavior).

HTTP mode: environment variable serves as the default, with per-request override via `Authorization: Bearer <key>` or `X-Transcend-Api-Key` header. This enables multi-tenant hosting (different API keys per client) and testing without restarting the server.

### SDK version

Stay on stable `@modelcontextprotocol/sdk` 1.x. The v2 split packages (`@modelcontextprotocol/server`, `@modelcontextprotocol/node`) are pre-release as of April 2026 and should be adopted in a separate migration once stable.

## Architecture

```
┌────────────────────────────────────────────────────┐
│  CLI entry point (--transport stdio|http)           │
├──────────────────────┬─────────────────────────────┤
│  stdio mode          │  http mode                  │
│  ┌────────────────┐  │  ┌───────────────────────┐  │
│  │ Single Server  │  │  │ Express app            │  │
│  │ + StdioTransport│  │  │  POST /mcp (JSON-RPC) │  │
│  └────────────────┘  │  │  GET  /mcp (SSE)       │  │
│                      │  │  DELETE /mcp (teardown) │  │
│                      │  │  GET /health            │  │
│                      │  │                         │  │
│                      │  │  Per-session:           │  │
│                      │  │   Server + Transport    │  │
│                      │  │   + InMemoryEventStore  │  │
│                      │  └───────────────────────┘  │
└──────────────────────┴─────────────────────────────┘
         Both share: buildMcpServer(), ToolDefinition[]
```

### Code organization

All transport infrastructure lives in `mcp-server-core/src/server/`:

- `build-server.ts` — creates an MCP `Server` with ListTools/CallTool handlers from `ToolDefinition[]`
- `resolve-api-key.ts` — API key resolution from env + headers
- `parse-args.ts` — CLI flag and env var parsing for transport config
- `event-store.ts` — `InMemoryEventStore` implementing the SDK's `EventStore` interface
- `run-http.ts` — Express app setup, session routing, TTL sweeper, graceful shutdown
- `create-server.ts` — entry point that delegates to stdio or HTTP based on `--transport`

Domain servers (`mcp-server-consent`, etc.) required zero changes — they call `createMCPServer()` which now handles both transports internally.

The unified server (`mcp-server`) uses `buildMcpServer()` and `runMcpHttp()` directly, constructing its `ToolRegistry` per session for API key isolation.

## Deployment targets

- **Container (Docker):** Primary target. Bind to `0.0.0.0`, set port via `TRANSCEND_HTTP_PORT`, terminate TLS at reverse proxy.
- **VM / bare metal:** Same binary, same flags.
- **Serverless (Lambda, Cloud Functions):** Not a target for this iteration. The stateful session model (in-memory transport map) requires a long-lived process. Stateless mode or external session storage would be needed — deferred.

## Security considerations

- **TLS:** Terminate at reverse proxy (nginx, ALB, Cloudflare). The server itself listens over plain HTTP.
- **API keys in headers:** Never logged, never sent in query strings. `resolveApiKey` and `extractApiKeyFromHeaders` handle extraction without logging the value.
- **DNS rebinding:** `createMcpExpressApp` from the SDK includes Host header validation when bound to localhost.
- **CORS:** Configurable via `--cors-origin` / `TRANSCEND_MCP_CORS_ORIGINS` for browser-based clients.
- **Rate limiting:** Not included in this iteration. Apply at reverse proxy or add Express middleware as a follow-up.
- **OAuth:** The SDK supports MCP auth metadata and Bearer token verification. Deferred — v1 uses direct API key authentication.

## Follow-ups

- Persistent `EventStore` for durable SSE replay across restarts
- OAuth / MCP auth metadata integration
- SDK v2 migration when stable
- Rate limiting middleware
- Prometheus / OpenTelemetry metrics endpoint
