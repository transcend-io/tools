# Transcend Developer Tools Monorepo

Public TypeScript monorepo for `@transcend-io/*` developer tools.

For setup, day-to-day commands, package conventions, changesets, and releases, start with
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Packages

The packages in `packages/` are the public developer tools for Transcend.

- [`packages/cli`](./packages/cli/) (`@transcend-io/cli`): the Transcend CLI, used to programmatically manage your Transcend
  infrastructure and data.
- [`packages/privacy-types`](./packages/privacy-types/) (`@transcend-io/privacy-types`): shared enums, codecs, and type
  definitions for Transcend APIs and product surfaces.

## MCP Servers

The [`packages/mcp/`](./packages/mcp/) directory contains [Model Context Protocol](https://modelcontextprotocol.io/) server packages that let AI agents interact with the Transcend platform. There are two ways to use them:

**Unified server** — install `@transcend-io/mcp-server` to get all 70+ tools in a single MCP server. Best when your agent can handle a large tool set.

**Domain servers** — install only the domains you need (e.g. `@transcend-io/mcp-server-consent`) to keep the tool count small and focused. This prevents AI agents from being overwhelmed by tools they don't need.

All servers require a `TRANSCEND_API_KEY` environment variable.

| Package                                                                          | Binary                      | Description                                        |
| -------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------- |
| [`@transcend-io/mcp-server`](./packages/mcp/mcp-server/)                         | `transcend-mcp`             | Unified server with all tools                      |
| [`@transcend-io/mcp-server-admin`](./packages/mcp/mcp-server-admin/)             | `transcend-mcp-admin`       | Organization, users, API keys                      |
| [`@transcend-io/mcp-server-assessments`](./packages/mcp/mcp-server-assessments/) | `transcend-mcp-assessments` | Privacy assessments                                |
| [`@transcend-io/mcp-server-consent`](./packages/mcp/mcp-server-consent/)         | `transcend-mcp-consent`     | Consent management, cookie triage                  |
| [`@transcend-io/mcp-server-core`](./packages/mcp/mcp-server-core/)               | —                           | Shared MCP infrastructure (not installed directly) |
| [`@transcend-io/mcp-server-discovery`](./packages/mcp/mcp-server-discovery/)     | `transcend-mcp-discovery`   | Data discovery, classification                     |
| [`@transcend-io/mcp-server-dsr`](./packages/mcp/mcp-server-dsr/)                 | `transcend-mcp-dsr`         | Data subject requests                              |
| [`@transcend-io/mcp-server-inventory`](./packages/mcp/mcp-server-inventory/)     | `transcend-mcp-inventory`   | Data inventory, silos, vendors                     |
| [`@transcend-io/mcp-server-preferences`](./packages/mcp/mcp-server-preferences/) | `transcend-mcp-preferences` | Privacy preferences                                |
| [`@transcend-io/mcp-server-workflows`](./packages/mcp/mcp-server-workflows/)     | `transcend-mcp-workflows`   | Workflow configuration                             |

See each package's README for tool lists, MCP client configuration examples, and environment variable details.
