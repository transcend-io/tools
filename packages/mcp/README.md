# Transcend MCP Servers

> **Beta** — these packages are under active development. APIs may change without notice.

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) servers that let AI agents interact with the [Transcend](https://transcend.io) privacy platform. Every server supports both **stdio** (local process) and **Streamable HTTP** (remote hosting) transports, so it works with any compliant client (Claude Desktop, Cursor, Cline, custom agents, etc.).

## Quick start (stdio + OAuth)

1. **Create an OAuth client** — an org admin opens [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients), creates a client, and copies the client ID and secret.
2. **Register a redirect URI** — add `http://127.0.0.1:your-client-redirect-port/callback` (use `127.0.0.1`, not `localhost`; path must be `/callback`). See [OAuth client setup](#oauth-client-setup) for IPv6 and multi-server ports.
3. **Configure your MCP client** — paste the JSON example below into Cursor (`.cursor/mcp.json`), Claude Desktop, or VS Code with your credentials.
4. **Restart the MCP client** — the server verifies your OAuth client at startup; connection errors usually mean a redirect URI or secret mismatch.
5. **Invoke any tool** — on the first tool call the server opens a browser for login. Complete consent and return to your agent.
6. **Use tools normally** — tokens stay in memory for this session. Restarting the MCP process requires signing in again.

## Prerequisites

- **Node.js** ≥ 22.12 (see each CLI package’s `engines` in `package.json`).
- **OAuth credentials** for stdio transport — see [OAuth client setup](#oauth-client-setup) below. Requires **admin access** to create OAuth clients in the Transcend dashboard.
- Packages are in **beta**. Install via `npm install -g @transcend-io/<package>` or use `npx -y @transcend-io/<package>`. To develop from source, clone this repository: copy [`secret.env.example`](../../secret.env.example) to **`secret.env`** at the repo root and set the OAuth environment variables; then from the repo root run `pnpm exec turbo run build --filter="@transcend-io/<package>..."` (trailing `...` includes dependencies such as `mcp-server-base`), then `set -a && source ./secret.env && set +a` and `pnpm -F @transcend-io/<package> exec node ./dist/cli.mjs` (or use [`scripts/mcp-run.sh`](../../scripts/mcp-run.sh) — see **Run from the monorepo** in each package README and [CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers)).

In client config, `npx` with `-y @transcend-io/...` runs that package’s published `bin` (see `package.json` in each package).

## OAuth client setup

Before configuring an MCP client, create OAuth credentials in the Transcend admin dashboard:

1. Navigate to [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients) and create an OAuth client (org admin required).
2. Copy the **client ID** and **client secret**.
3. Register a redirect URI that **exactly** matches what the server will send:
   - Default: `http://127.0.0.1:{port}/callback`
   - IPv6: `http://[::1]:{port}/callback` (set `TRANSCEND_OAUTH_REDIRECT_HOST=::1`)

> **Use `127.0.0.1`, not `localhost`.** The server builds redirect URIs from `TRANSCEND_OAUTH_REDIRECT_HOST` (default `127.0.0.1`). Registering `http://localhost:{port}/callback` will fail verification even if the port matches.

> **Host, port, and path must all match.** The redirect URI must end with `/callback`. `TRANSCEND_OAUTH_REDIRECT_PORT` must match the port in the registered URI.

For example, if `TRANSCEND_OAUTH_REDIRECT_PORT` is `your-client-redirect-port`, register `http://127.0.0.1:your-client-redirect-port/callback` (default) or `http://[::1]:your-client-redirect-port/callback` with `TRANSCEND_OAUTH_REDIRECT_HOST=::1`.

**Multiple domain servers:** use a **different** `TRANSCEND_OAUTH_REDIRECT_PORT` (and matching redirect URI) for each server. One OAuth client can register **multiple** redirect URIs on the same client (e.g. `:your-client-redirect-port/callback` and `:your-other-redirect-port/callback`).

**Startup vs browser login:** at startup the server verifies client ID, secret, and redirect URI via Transcend's API. If verification fails, the MCP server will not connect — fix credentials first. After startup succeeds, the **browser** opens on the first tool call to complete user consent.

On first tool call, the server opens a browser for login. Tokens are session-only (in-memory); restarting the MCP process requires signing in again.

### OAuth scopes

Each server requests domain-specific OAuth scopes during browser consent (plus `offline_access` for token refresh). The signed-in user must hold these permissions in Transcend; otherwise login succeeds but individual tools may return authorization errors.

| Package                                               | OAuth scopes requested                                                                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`mcp`](./mcp/) (unified)                             | Union of all domain scopes below                                                                                                                                                                 |
| [`mcp-server-admin`](./mcp-server-admin/)             | `ViewEmployees`, `ViewApiKeys`, `ManageApiKeys`                                                                                                                                                  |
| [`mcp-server-assessment`](./mcp-server-assessment/)   | `ViewAssessments`, `ViewAssignedAssessments`, `ManageAssessments`, `ManageAssignedAssessments`                                                                                                   |
| [`mcp-server-consent`](./mcp-server-consent/)         | `ViewConsentManager`, `ViewAssignedConsentManager`, `ManageConsentManager`, `ManageAssignedConsentManager`, `ViewDataFlow`, `ManageDataFlow`                                                     |
| [`mcp-server-discovery`](./mcp-server-discovery/)     | `ViewDataMap`, `ViewAssignedIntegrations`, `ViewCodeScanning`, `ManageCodeScanning`, `ViewPrompts`, `ViewPromptRuns`, `ExecutePrompt`                                                            |
| [`mcp-server-docs`](./mcp-server-docs/)               | _(none — tools fetch public docs URLs only)_                                                                                                                                                     |
| [`mcp-server-dsr`](./mcp-server-dsr/)                 | `ViewRequests`, `ViewAssignedRequests`, `MakeDataSubjectRequest`, `ManageAssignedRequests`, `ViewRequestCompilation`, `ManageRequestCompilation`                                                 |
| [`mcp-server-inventory`](./mcp-server-inventory/)     | `ViewDataMap`, `ViewAssignedIntegrations`, `ManageDataMap`, `ManageAssignedIntegrations`, `ViewDataInventory`, `ViewAssignedDataInventory`, `ManageDataInventory`, `ManageAssignedDataInventory` |
| [`mcp-server-preferences`](./mcp-server-preferences/) | `ViewPrivacyCenter`, `ManagePrivacyCenter`                                                                                                                                                       |
| [`mcp-server-workflows`](./mcp-server-workflows/)     | `ViewAllActionItems`, `ManageAllActionItems`, `ViewEmailTemplates`                                                                                                                               |

Canonical scope lists live in each package's `src/scopes.ts`.

### Troubleshooting

| Symptom                                          | Likely cause                               | Fix                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| MCP server fails to connect / start              | Startup client verification failed         | Check client ID, secret, and that the registered redirect URI **exactly** matches `http://127.0.0.1:{port}/callback` (not `localhost`) |
| OAuth login fails after browser redirect         | Redirect URI mismatch                      | Ensure host (`127.0.0.1` or `::1`), port, and `/callback` path match between dashboard and env vars                                    |
| `EADDRINUSE` / port in use                       | Two servers share a redirect port          | Assign a unique `TRANSCEND_OAUTH_REDIRECT_PORT` per server and register each URI                                                       |
| Browser opened but tool still fails              | Consent denied, timed out, or closed early | Complete consent in the browser; if timed out, restart the MCP client and try again (do not retry automatically)                       |
| Login works but a tool returns permission errors | User lacks required OAuth scopes           | Sign in as a user with the scopes listed above, or use a domain server with narrower scope requirements                                |
| Must re-login after every restart                | Expected behavior                          | OAuth tokens are session-only (in-memory); restart MCP to sign in again                                                                |

## Choosing a server

There are two ways to consume the MCP tools, and they can be mixed freely.

### Unified server

Install **`@transcend-io/mcp`** to get every tool (73 across all domains) in a single process. This is the fastest way to get started and is ideal when your agent can handle a large tool set.

**Claude Desktop** (`claude_desktop_config.json`) / **Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "transcend": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-client-redirect-port"
      }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "transcend": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-client-redirect-port"
      }
    }
  }
}
```

### Domain servers

Install only the domains you need. Smaller tool counts help AI agents stay focused and reduce token overhead from tool descriptions. You can run multiple domain servers side by side.

**Claude Desktop** (`claude_desktop_config.json`) / **Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "transcend-consent": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-consent"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-client-redirect-port"
      }
    },
    "transcend-dsr": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-dsr"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-other-redirect-port"
      }
    }
  }
}
```

> When running multiple domain servers, use a **different** `TRANSCEND_OAUTH_REDIRECT_PORT` (and matching redirect URI) for each server. One OAuth client can register multiple redirect URIs.

**VS Code** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "transcend-consent": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-consent"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-client-redirect-port"
      }
    },
    "transcend-dsr": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-dsr"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-other-redirect-port"
      }
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

The MCP server supports three authentication modes:

### OAuth (stdio, recommended)

For external consumers (Claude Enterprise, Cursor, etc.) using stdio transport, authenticate via browser OAuth login. Set these environment variables in your MCP client config (see [OAuth client setup](#oauth-client-setup)):

- `TRANSCEND_OAUTH_CLIENT_ID` — client ID from [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients); enables OAuth stdio mode when set (unless `TRANSCEND_API_KEY` is also set)
- `TRANSCEND_OAUTH_CLIENT_SECRET` — client secret from the same page
- `TRANSCEND_OAUTH_REDIRECT_PORT` — localhost port for the OAuth callback server; **must match the port in your registered redirect URI**
- `TRANSCEND_OAUTH_REDIRECT_HOST` — loopback host for the OAuth callback (`127.0.0.1` default, or `::1` for IPv6 format)
- `TRANSCEND_OAUTH_ISSUER` — optional; **auto-detected in production** by probing regional backends (`api.transcend.io`, `api.us.transcend.io`). Only needed in test environments.

OAuth mode activates when `TRANSCEND_OAUTH_CLIENT_ID` is set and `TRANSCEND_API_KEY` is not. At startup the server verifies credentials and redirect URI; on first tool call it opens a browser for user consent. Tokens are kept in process memory only; restarting the MCP client requires signing in again.

### API key (stdio alternative)

For scripts or local development, stdio mode also accepts `TRANSCEND_API_KEY` instead of OAuth. When both are set, the API key takes precedence and OAuth is disabled. This bypasses browser login but requires managing a long-lived secret in your MCP client config.

### Session cookie (in-app dashboard)

For the Transcend dashboard's internal MCP integration, the server accepts session cookie authentication over HTTP transport. The dashboard forwards the user's `laravel_session` cookie and organization ID to the MCP server:

- `Cookie: laravel_session=<session-token>`
- `x-transcend-active-organization-id: <org-uuid>`

When both cookie and API key headers are present, the session cookie takes priority.

**Sidecar pattern (Prometheus):** The MCP server supports auth-free initialization for use as a sidecar process. In this mode, the server starts without any credentials, allowing the MCPClient to connect and list tools at startup. Per-request auth headers (Cookie + org ID) are then resolved from each subsequent `tools/call` request and propagated through `AsyncLocalStorage` so that concurrent requests from different users never share credentials.

## Packages

| Package                                               | Binary                      | Tools | Description                                      |
| ----------------------------------------------------- | --------------------------- | ----: | ------------------------------------------------ |
| [`mcp`](./mcp/)                                       | `transcend-mcp`             |    73 | Unified server — all tools in one process        |
| [`mcp-server-admin`](./mcp-server-admin/)             | `transcend-mcp-admin`       |     8 | Organization, users, teams, API keys             |
| [`mcp-server-assessment`](./mcp-server-assessment/)   | `transcend-mcp-assessment`  |    14 | Privacy assessments, templates, groups           |
| [`mcp-server-consent`](./mcp-server-consent/)         | `transcend-mcp-consent`     |    14 | Consent management, analytics, cookie triage     |
| [`mcp-server-base`](./mcp-server-base/)               | —                           |     — | Shared infrastructure (not installed directly)   |
| [`mcp-server-discovery`](./mcp-server-discovery/)     | `transcend-mcp-discovery`   |     6 | Data discovery, classification, NER              |
| [`mcp-server-docs`](./mcp-server-docs/)               | `transcend-mcp-docs`        |     2 | Transcend documentation lookup (list + fetch)    |
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

| Variable                        | Required (stdio OAuth) | Default                                    | Description                                                                                                                              |
| ------------------------------- | ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSCEND_OAUTH_CLIENT_ID`     | Yes                    | —                                          | Client ID from [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients); enables OAuth stdio mode when set |
| `TRANSCEND_OAUTH_CLIENT_SECRET` | Yes                    | —                                          | Client secret from the same OAuth clients page                                                                                           |
| `TRANSCEND_OAUTH_REDIRECT_PORT` | Yes                    | —                                          | Localhost port for the OAuth callback server; **must match the port in your registered redirect URI**                                    |
| `TRANSCEND_OAUTH_REDIRECT_HOST` | No                     | `127.0.0.1`                                | Loopback host for the OAuth callback (`127.0.0.1` or `::1` for `http://[::1]:{port}/callback`)                                           |
| `TRANSCEND_OAUTH_ISSUER`        | No                     | auto-detected                              | OAuth issuer URL; production auto-detects region. Test-only override                                                                     |
| `TRANSCEND_API_KEY`             | No                     | —                                          | API key for stdio (alternative to OAuth) or HTTP default auth. Disables OAuth when set alongside client ID                               |
| `TRANSCEND_API_URL`             | No                     | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI / main monorepo convention)                                                                         |
| `SOMBRA_URL`                    | No                     | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention)                                                                                       |
| `TRANSCEND_DASHBOARD_URL`       | No                     | `https://app.transcend.io`                 | Override the admin-dashboard base URL used for deep links. Useful for testing against staging or local dashboards                        |
| `TRANSCEND_HTTP_PORT`           | No                     | `3000`                                     | HTTP listen port                                                                                                                         |
| `TRANSCEND_HTTP_HOST`           | No                     | `127.0.0.1`                                | HTTP listen host                                                                                                                         |
| `TRANSCEND_MCP_CORS_ORIGINS`    | No                     | —                                          | Comma-separated allowed CORS origins                                                                                                     |
| `TRANSCEND_MCP_SESSION_TTL_MS`  | No                     | `1800000`                                  | Idle session timeout (ms)                                                                                                                |

**Monorepo:** store these in root **`secret.env`** (from [`secret.env.example`](../../secret.env.example)); load with `source` or [`scripts/mcp-run.sh`](../../scripts/mcp-run.sh). See [CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers).

## Contributing

See the [MCP Servers section of CONTRIBUTING.md](../../CONTRIBUTING.md#mcp-servers) for how to add tools, run tests, and publish packages.
