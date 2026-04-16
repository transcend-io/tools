# @transcend-io/mcp-server-core

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Shared infrastructure for all Transcend MCP Server packages. Provides the base GraphQL client, tool type definitions, validation helpers, error handling, and the `createMCPServer` factory used by each domain server.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`) when building or importing this library.

## Install

This package is **not** a standalone MCP CLI: it has no `bin`. Domain servers and the unified `mcp-server` depend on it. In this repository it is consumed as `workspace:*`; when published to npm, downstream packages will list it as a normal dependency.

Until publication, use a checkout of this repository (see **Development** below).

API keys for running a domain or unified MCP server locally belong in the repository root **`secret.env`** (copy from [`secret.env.example`](../../../secret.env.example)); see [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers).

## What's inside

- **`TranscendGraphQLBase`** — Base GraphQL client with query execution, pagination, and logging. Domain packages extend this via mixin classes.
- **`createMCPServer`** — Bootstraps a stdio MCP server from a list of tool definitions and client factories.
- **Tool helpers** — `validateArgs`, `createToolResult`, `createListResult`, common Zod schemas (`PaginationSchema`), and shared TypeScript types (`ToolDefinition`, `ToolClients`, `ToolAnnotations`).
- **Error utilities** — `ToolError`, `ErrorCode`, `classifyHttpError` for consistent error responses.

## Usage

This package is not intended to be installed directly by end users. It is a `workspace:*` dependency consumed by each domain MCP package and the umbrella server.

```ts
import {
  createMCPServer,
  TranscendGraphQLBase,
  validateArgs,
  createToolResult,
  z,
} from '@transcend-io/mcp-server-core';
```

## Development

From the repository root:

```bash
pnpm -F @transcend-io/mcp-server-core build
pnpm -F @transcend-io/mcp-server-core test
```

To run a composed server against the real API, configure root **`secret.env`** and follow **Run from the monorepo** in [`mcp-server`](../mcp-server/README.md) or any domain package README.

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for working across MCP packages and adding tools.

## Related packages

See the [MCP section of the root README](../../../README.md#mcp-servers) for the full package list and install guide.
