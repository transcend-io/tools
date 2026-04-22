# Transcend MCP Servers

> **Alpha** — these packages are under active development and have not yet been published to npm. APIs may change without notice.

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) servers that let AI agents interact with the [Transcend](https://transcend.io) privacy platform. Every server supports both **stdio** (local process) and **Streamable HTTP** (remote hosting) transports, so it works with any compliant client (Claude Desktop, Cursor, Cline, custom agents, etc.).

## Prerequisites

- **Node.js** ≥ 22.12 (see each CLI package’s `engines` in `package.json`).
- Packages are **alpha** and **not yet published to npm**. Global install and `npx` examples below assume a future registry release. **Until then**, clone this repository: copy [`secret.env.example`](../../secret.env.example) to **`secret.env`** at the repo root and set `TRANSCEND_API_KEY`; then from the repo root run `pnpm exec turbo run build --filter="@transcend-io/<package>..."` (trailing `...` includes dependencies such as `mcp-server-base`), then `set -a && source ./secret.env && set +a` and `pnpm -F @transcend-io/<package> exec node ./dist/cli.mjs` (or use [`scripts/mcp-run.sh`](../../scripts/mcp-run.sh) — see **Run from the monorepo** in each package README and [CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers)).

In client config, `npx` with `-y @transcend-io/...` runs that package’s published `bin` (see `package.json` in each package).

## Choosing a server

There are two ways to consume the MCP tools, and they can be mixed freely.

### Unified server

Install **`@transcend-io/mcp`** to get every tool (71 across all domains) in a single process. This is the fastest way to get started and is ideal when your agent can handle a large tool set.

```json
{
  "mcpServers": {
    "transcend": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp"],
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
TRANSCEND_API_KEY=your-api-key npx @transcend-io/mcp --transport http --port 3000
```

This starts a Streamable HTTP server at `http://127.0.0.1:3000/mcp` with a health check at `/health`. Each client connection gets its own session with automatic cleanup after idle timeout.

For Docker, reverse proxy, and cloud deployment patterns, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Authentication

The MCP server supports two authentication modes that can be used independently or simultaneously:

### API key (external customers)

For external consumers (Claude Enterprise, Cursor, etc.), provide a Transcend API key:

- **Stdio**: Set the `TRANSCEND_API_KEY` environment variable
- **HTTP**: Send `Authorization: Bearer <key>` or `X-Transcend-Api-Key: <key>` header, or fall back to `TRANSCEND_API_KEY` env var

### Session cookie (in-app dashboard)

For the Transcend dashboard's internal MCP integration, the server accepts session cookie authentication over HTTP transport. The dashboard forwards the user's `laravel_session` cookie and organization ID to the MCP server:

- `Cookie: laravel_session=<session-token>`
- `x-transcend-active-organization-id: <org-uuid>`

When both cookie and API key headers are present, the session cookie takes priority.

**Sidecar pattern (Prometheus):** The MCP server supports auth-free initialization for use as a sidecar process. In this mode, the server starts without any credentials, allowing the MCPClient to connect and list tools at startup. Per-request auth headers (Cookie + org ID) are then resolved from each subsequent `tools/call` request and propagated through `AsyncLocalStorage` so that concurrent requests from different users never share credentials.

## Packages

| Package                                               | Binary                      | Tools | Description                                      |
| ----------------------------------------------------- | --------------------------- | ----: | ------------------------------------------------ |
| [`mcp`](./mcp/)                                       | `transcend-mcp`             |    71 | Unified server — all tools in one process        |
| [`mcp-server-admin`](./mcp-server-admin/)             | `transcend-mcp-admin`       |     8 | Organization, users, teams, API keys             |
| [`mcp-server-assessments`](./mcp-server-assessments/) | `transcend-mcp-assessments` |    14 | Privacy assessments, templates, groups           |
| [`mcp-server-consent`](./mcp-server-consent/)         | `transcend-mcp-consent`     |    12 | Consent management, cookie & data-flow triage    |
| [`mcp-server-base`](./mcp-server-base/)               | —                           |     — | Shared infrastructure (not installed directly)   |
| [`mcp-server-discovery`](./mcp-server-discovery/)     | `transcend-mcp-discovery`   |     6 | Data discovery, classification, NER              |
| [`mcp-server-dsr`](./mcp-server-dsr/)                 | `transcend-mcp-dsr`         |    12 | Data subject requests (submit, track, respond)   |
| [`mcp-server-inventory`](./mcp-server-inventory/)     | `transcend-mcp-inventory`   |    10 | Data inventory, silos, vendors, data points      |
| [`mcp-server-preferences`](./mcp-server-preferences/) | `transcend-mcp-preferences` |     6 | Privacy preference store (query, upsert, delete) |
| [`mcp-server-workflows`](./mcp-server-workflows/)     | `transcend-mcp-workflows`   |     3 | Workflow & email-template configuration          |

See each package's README for full tool lists, detailed environment variable docs, and client configuration examples.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  mcp  (unified)                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ToolRegistry                                        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │ │
│  │  │  admin   │ │ consent  │ │   dsr    │  ...       │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘            │ │
│  └───────┼─────────────┼────────────┼──────────────────┘ │
│          └─────────────┼────────────┘                    │
│                        ▼                                 │
│               mcp-server-base                            │
│        (GraphQL base, REST client, validation)           │
└──────────────────────────────────────────────────────────┘
```

Each domain package (admin, consent, dsr, ...) is a self-contained MCP server with its own CLI entry point. It can run standalone or be composed into the unified server. All domain packages depend on `mcp-server-base` for shared infrastructure:

- **`TranscendGraphQLBase`** — base class extended by each domain's GraphQL mixin
- **`TranscendRestClient`** — REST client for the Sombra API (used by DSR, preferences, and discovery)
- **`createMCPServer`** — factory that bootstraps an MCP server from tool definitions (stdio or HTTP, selected via `--transport`)
- **`buildMcpServer`** — lower-level factory that creates a `Server` with tool handlers (no transport)
- **`runMcpHttp`** — starts an Express-based Streamable HTTP server with session management
- **Validation & helpers** — Zod schemas, `validateArgs`, `createToolResult`, `createListResult`

The unified `mcp` package aggregates tools via `ToolRegistry` and composes a `TranscendGraphQLClient` that mixes in all domain GraphQL capabilities.

## Environment variables

All servers share the same environment variables:

| Variable                       | Required               | Default                                    | Description                                                                                       |
| ------------------------------ | ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `TRANSCEND_API_KEY`            | Yes (stdio), No (HTTP) | —                                          | Transcend API key. In HTTP mode, optional if using session cookie or per-request API key headers. |
| `TRANSCEND_API_URL`            | No                     | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL                                                                               |
| `TRANSCEND_GRAPHQL_URL`        | No                     | `https://api.transcend.io`                 | GraphQL API URL                                                                                   |
| `TRANSCEND_HTTP_PORT`          | No                     | `3000`                                     | HTTP listen port                                                                                  |
| `TRANSCEND_HTTP_HOST`          | No                     | `127.0.0.1`                                | HTTP listen host                                                                                  |
| `TRANSCEND_MCP_CORS_ORIGINS`   | No                     | —                                          | Comma-separated allowed CORS origins                                                              |
| `TRANSCEND_MCP_SESSION_TTL_MS` | No                     | `1800000`                                  | Idle session timeout (ms)                                                                         |

**Monorepo:** store these in root **`secret.env`** (from [`secret.env.example`](../../secret.env.example)); load with `source` or [`scripts/mcp-run.sh`](../../scripts/mcp-run.sh). See [CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers).

## Contributing

See the [MCP Servers section of CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers) for how to add tools, run tests, and publish packages.
