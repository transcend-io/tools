# @transcend-io/mcp-server-core

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Shared infrastructure for all Transcend MCP Server packages. Provides the base GraphQL and REST clients, tool type definitions, validation helpers, error handling, and the `createMCPServer` factory used by each domain server.

## What's inside

- **`AuthCredentials`** — Discriminated union type representing API key or session cookie authentication. The `authHeaders()` helper converts credentials into the correct outbound HTTP headers.
- **`resolveAuth` / `tryResolveAuth`** — Resolves `AuthCredentials` from inbound HTTP headers (session cookie, API key) or `TRANSCEND_API_KEY` env var. `resolveAuth` throws when no auth is found; `tryResolveAuth` returns `null` (used during auth-free MCP initialization).
- **`TranscendGraphQLBase`** — Base GraphQL client with query execution, pagination, and logging. Accepts `AuthCredentials | null` and delegates header generation to `authHeaders()`. Supports `updateAuth()` for per-request credential updates in HTTP transport. Domain packages extend this via mixin classes.
- **`TranscendRestClient`** — REST client for the Sombra API. Also accepts `AuthCredentials | null` with `updateAuth()` support.
- **`createMCPServer`** — Bootstraps an MCP server (stdio or HTTP) from a list of tool definitions and client factories.
- **`buildMcpServer`** — Creates an MCP `Server` with ListTools/CallTool handlers from `ToolDefinition[]` without connecting a transport.
- **`runMcpHttp`** — Starts an Express-based Streamable HTTP server with per-session Server instances, SSE resume, health check, and CORS. Supports session cookie forwarding (`credentials: true`), auth-free initialization, and per-request auth updates via `McpServerWithAuthUpdate`.
- **`parseTransportArgs`** — Parses `--transport`, `--port`, `--host`, and related CLI flags / env vars.
- **`InMemoryEventStore`** — In-memory SSE event store for session resumability.
- **Tool helpers** — `validateArgs`, `createToolResult`, `createListResult`, common Zod schemas (`PaginationSchema`), and shared TypeScript types (`ToolDefinition`, `ToolClients`, `ToolAnnotations`).
- **Error utilities** — `ToolError`, `ErrorCode`, `classifyHttpError` for consistent error responses.

## Usage

This package is not intended to be installed directly by end users. It is a `workspace:*` dependency consumed by each domain MCP package and the umbrella server.

```ts
import {
  createMCPServer,
  TranscendGraphQLBase,
  TranscendRestClient,
  validateArgs,
  createToolResult,
  z,
} from '@transcend-io/mcp-server-core';
```

## Related packages

See the [MCP section of the root README](../../../README.md#mcp-servers) for the full package list and install guide.
