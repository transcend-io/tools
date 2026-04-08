# @transcend-io/mcp-server-core

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Shared infrastructure for all Transcend MCP Server packages. Provides the base GraphQL and REST clients, tool type definitions, validation helpers, error handling, and the `createMCPServer` factory used by each domain server.

## What's inside

- **`TranscendGraphQLBase`** — Base GraphQL client with query execution, pagination, and logging. Domain packages extend this via mixin classes.
- **`TranscendRestClient`** — REST client for the Sombra API.
- **`createMCPServer`** — Bootstraps a stdio MCP server from a list of tool definitions and client factories.
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
