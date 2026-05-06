# @transcend-io/mcp-server-base

> **Beta** — this package is under active development. APIs may change without notice.

Shared infrastructure for all Transcend MCP Server packages. Provides the base GraphQL and REST clients, tool type definitions, validation helpers, error handling, and the `createMCPServer` factory used by each domain server.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`) when building or importing this library.

## Install

This package is **not** a standalone MCP CLI: it has no `bin`. Domain servers and the unified `mcp` package depend on it. In this repository it is consumed as `workspace:*`; when published to npm, downstream packages will list it as a normal dependency.

For development, use a checkout of this repository (see **Development** below).

API keys for running a domain or unified MCP server locally belong in the repository root **`secret.env`** (copy from [`secret.env.example`](../../../secret.env.example)); see [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers).

## What's inside

- **`AuthCredentials`** — Discriminated union type representing API key or session cookie authentication. The `authHeaders()` helper converts credentials into the correct outbound HTTP headers.
- **`resolveAuth` / `tryResolveAuth`** — Resolves `AuthCredentials` from inbound HTTP headers (session cookie, API key) or `TRANSCEND_API_KEY` env var. `resolveAuth` throws when no auth is found; `tryResolveAuth` returns `null` (used during auth-free MCP initialization).
- **`requestAuthContext` / `getRequestAuth`** — `AsyncLocalStorage`-based per-request auth context. In HTTP transport, each inbound request's credentials are stored here so that downstream clients use the correct auth without shared mutable state. Concurrent requests with different users' credentials are fully isolated.
- **`TranscendGraphQLBase`** — Base GraphQL client with query execution, pagination, and logging. Accepts `AuthCredentials | null` for initial/default auth and reads per-request overrides from `requestAuthContext`. Domain packages extend this via mixin classes.
- **`TranscendRestClient`** — REST client for the Sombra API. Same auth model as `TranscendGraphQLBase`.
- **`createMCPServer`** — Bootstraps an MCP server (stdio or HTTP) from a list of tool definitions and client factories.
- **`buildMcpServer`** — Creates an MCP `Server` with ListTools/CallTool handlers from `ToolDefinition[]` without connecting a transport.
- **`runMcpHttp`** — Starts an Express-based Streamable HTTP server with per-session Server instances, SSE resume, health check, and CORS. Wraps each inbound request in `requestAuthContext.run()` for per-request auth isolation.
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
} from '@transcend-io/mcp-server-base';
```

## Development

From the repository root:

```bash
pnpm -F @transcend-io/mcp-server-base build
pnpm -F @transcend-io/mcp-server-base test
```

To run a composed server against the real API, configure root **`secret.env`** and follow **Run from the monorepo** in [`mcp`](../mcp/README.md) or any domain package README.

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for working across MCP packages and adding tools.

## Related packages

See the [MCP section of the root README](../../../README.md#mcp-servers) for the full package list and install guide.
