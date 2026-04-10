# Transcend MCP Servers

> **Alpha** — these packages are under active development and have not yet been published to npm. APIs may change without notice.

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) servers that let AI agents interact with the [Transcend](https://transcend.io) privacy platform. Every server supports both **stdio** (local process) and **Streamable HTTP** (remote hosting) transports, so it works with any compliant client (Claude Desktop, Cursor, Cline, custom agents, etc.).

## Choosing a server

There are two ways to consume the MCP tools, and they can be mixed freely.

### Unified server

Install **`@transcend-io/mcp-server`** to get every tool (71 across all domains) in a single process. This is the fastest way to get started and is ideal when your agent can handle a large tool set.

```json
{
  "mcpServers": {
    "transcend": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server"],
      "env": { "TRANSCEND_API_KEY": "your-api-key" }
    }
  }
}
```

### Domain servers

Install only the domains you need. Smaller tool counts help AI agents stay focused and reduce token overhead from tool descriptions. You can run multiple domain servers side by side.

```json
{
  "mcpServers": {
    "transcend-consent": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-consent"],
      "env": { "TRANSCEND_API_KEY": "your-api-key" }
    },
    "transcend-dsr": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-dsr"],
      "env": { "TRANSCEND_API_KEY": "your-api-key" }
    }
  }
}
```

### Picking the right approach

| Scenario                                                      | Recommendation                                   |
| ------------------------------------------------------------- | ------------------------------------------------ |
| Exploring what Transcend can do                               | Unified server — try everything at once          |
| Production agent with a narrow task (e.g. cookie triage)      | Single domain server (e.g. `mcp-server-consent`) |
| Agent that spans a few domains (e.g. inventory + assessments) | Multiple domain servers running side by side     |
| Minimizing token usage / tool-selection errors                | Domain servers — fewer tools means less noise    |
| Remote hosting / multi-user deployment                        | Any server with `--transport http`               |

## Remote HTTP transport

Any server can be started in HTTP mode for remote hosting:

```bash
TRANSCEND_API_KEY=your-api-key npx @transcend-io/mcp-server --transport http --port 3000
```

This starts a Streamable HTTP server at `http://127.0.0.1:3000/mcp` with a health check at `/health`. Each client connection gets its own session with automatic cleanup after idle timeout.

For Docker, reverse proxy, and cloud deployment patterns, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Packages

| Package                                               | Binary                      | Tools | Description                                      |
| ----------------------------------------------------- | --------------------------- | ----: | ------------------------------------------------ |
| [`mcp-server`](./mcp-server/)                         | `transcend-mcp`             |    71 | Unified server — all tools in one process        |
| [`mcp-server-admin`](./mcp-server-admin/)             | `transcend-mcp-admin`       |     8 | Organization, users, teams, API keys             |
| [`mcp-server-assessments`](./mcp-server-assessments/) | `transcend-mcp-assessments` |    14 | Privacy assessments, templates, groups           |
| [`mcp-server-consent`](./mcp-server-consent/)         | `transcend-mcp-consent`     |    12 | Consent management, cookie & data-flow triage    |
| [`mcp-server-core`](./mcp-server-core/)               | —                           |     — | Shared infrastructure (not installed directly)   |
| [`mcp-server-discovery`](./mcp-server-discovery/)     | `transcend-mcp-discovery`   |     6 | Data discovery, classification, NER              |
| [`mcp-server-dsr`](./mcp-server-dsr/)                 | `transcend-mcp-dsr`         |    12 | Data subject requests (submit, track, respond)   |
| [`mcp-server-inventory`](./mcp-server-inventory/)     | `transcend-mcp-inventory`   |    10 | Data inventory, silos, vendors, data points      |
| [`mcp-server-preferences`](./mcp-server-preferences/) | `transcend-mcp-preferences` |     6 | Privacy preference store (query, upsert, delete) |
| [`mcp-server-workflows`](./mcp-server-workflows/)     | `transcend-mcp-workflows`   |     3 | Workflow & email-template configuration          |

See each package's README for full tool lists, detailed environment variable docs, and client configuration examples.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  mcp-server  (unified)                                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ToolRegistry                                        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │ │
│  │  │  admin   │ │ consent  │ │   dsr    │  ...       │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘            │ │
│  └───────┼─────────────┼────────────┼──────────────────┘ │
│          └─────────────┼────────────┘                    │
│                        ▼                                 │
│               mcp-server-core                            │
│        (GraphQL base, REST client, validation)           │
└──────────────────────────────────────────────────────────┘
```

Each domain package (admin, consent, dsr, ...) is a self-contained MCP server with its own CLI entry point. It can run standalone or be composed into the unified server. All domain packages depend on `mcp-server-core` for shared infrastructure:

- **`TranscendGraphQLBase`** — base class extended by each domain's GraphQL mixin
- **`TranscendRestClient`** — REST client for the Sombra API (used by DSR, preferences, and discovery)
- **`createMCPServer`** — factory that bootstraps an MCP server from tool definitions (stdio or HTTP, selected via `--transport`)
- **`buildMcpServer`** — lower-level factory that creates a `Server` with tool handlers (no transport)
- **`runMcpHttp`** — starts an Express-based Streamable HTTP server with session management
- **Validation & helpers** — Zod schemas, `validateArgs`, `createToolResult`, `createListResult`

The unified `mcp-server` package aggregates tools via `ToolRegistry` and composes a `TranscendGraphQLClient` that mixes in all domain GraphQL capabilities.

## Environment variables

All servers share the same environment variables:

| Variable                       | Required    | Default                                    | Description                                     |
| ------------------------------ | ----------- | ------------------------------------------ | ----------------------------------------------- |
| `TRANSCEND_API_KEY`            | Yes (stdio) | —                                          | Transcend API key (HTTP: fallback if no header) |
| `TRANSCEND_API_URL`            | No          | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL                             |
| `TRANSCEND_GRAPHQL_URL`        | No          | `https://api.transcend.io`                 | GraphQL API URL                                 |
| `TRANSCEND_HTTP_PORT`          | No          | `3000`                                     | HTTP listen port                                |
| `TRANSCEND_HTTP_HOST`          | No          | `127.0.0.1`                                | HTTP listen host                                |
| `TRANSCEND_MCP_CORS_ORIGINS`   | No          | —                                          | Comma-separated allowed CORS origins            |
| `TRANSCEND_MCP_SESSION_TTL_MS` | No          | `1800000`                                  | Idle session timeout (ms)                       |

## Contributing

See the [MCP Servers section of CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers) for how to add tools, run tests, and publish packages.
