# @transcend-io/mcp

> **Beta** — this package is under active development. APIs may change without notice.

Unified Transcend MCP Server that combines all domain tools into a single server. This is the "everything in one place" option — install this package when you want access to all 73 Transcend tools at once.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set the OAuth environment variables (see **Run from the monorepo**).

## Install

Install the CLI globally:

```bash
npm install -g @transcend-io/mcp
```

Or run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

### stdio (local, default)

```bash
# With OAuth env vars in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_OAUTH_ISSUER=https://api.transcend.io \
TRANSCEND_OAUTH_CLIENT_ID=your-client-id \
TRANSCEND_OAUTH_CLIENT_SECRET=your-client-secret \
TRANSCEND_OAUTH_REDIRECT_PORT=5555 \
transcend-mcp
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### HTTP (remote hosting)

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp --transport http --port 3000
```

This starts a Streamable HTTP server at `http://127.0.0.1:3000/mcp` with a health check at `/health`. See [DEPLOYMENT.md](../DEPLOYMENT.md) for Docker, reverse proxy, and production deployment patterns.

### OAuth client setup

Before configuring your MCP client:

1. Navigate to [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients) and create an OAuth client.
2. Copy the **client ID** and **client secret**.
3. Register a redirect URI using the **same port** you will set in `TRANSCEND_OAUTH_REDIRECT_PORT`:
   - `http://127.0.0.1:{port}/callback`, or
   - `http://[::1]:{port}/callback`

> **`TRANSCEND_OAUTH_REDIRECT_PORT` must exactly match the port in your registered redirect URI.** If the port in the URI and the env var differ, OAuth login will fail.

For example, if `TRANSCEND_OAUTH_REDIRECT_PORT` is `"5555"`, register `http://127.0.0.1:5555/callback` (default) or `http://[::1]:5555/callback` with `TRANSCEND_OAUTH_REDIRECT_HOST=::1`.

On first tool call, the server opens a browser for login. Tokens are session-only (in-memory); restarting the MCP process requires signing in again.

### Environment variables

| Variable                        | Required (stdio) | Default                                    | Description                                                                                                                                       |
| ------------------------------- | ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSCEND_OAUTH_ISSUER`        | Yes              | —                                          | OAuth authorization server URL                                                                                                                    |
| `TRANSCEND_OAUTH_CLIENT_ID`     | Yes              | —                                          | Client ID from [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients)                                             |
| `TRANSCEND_OAUTH_CLIENT_SECRET` | Yes              | —                                          | Client secret from the same OAuth clients page                                                                                                    |
| `TRANSCEND_OAUTH_REDIRECT_PORT` | Yes              | —                                          | Localhost port for the OAuth callback server; **must match the port in your registered redirect URI**                                             |
| `TRANSCEND_OAUTH_REDIRECT_HOST` | No               | `127.0.0.1`                                | Loopback host for the OAuth callback (`127.0.0.1` or `::1` for `http://[::1]:{port}/callback`)                                                    |
| `TRANSCEND_API_URL`             | No               | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI convention)                                                                                                  |
| `SOMBRA_URL`                    | No               | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention)                                                                                                |
| `TRANSCEND_DASHBOARD_URL`       | No               | `https://app.transcend.io`                 | Override the admin-dashboard base URL used for deep links returned by tool responses. Intended for local development against staging / fake hosts |
| `TRANSCEND_HTTP_PORT`           | No               | `3000`                                     | HTTP listen port                                                                                                                                  |
| `TRANSCEND_HTTP_HOST`           | No               | `127.0.0.1`                                | HTTP listen host                                                                                                                                  |
| `TRANSCEND_MCP_CORS_ORIGINS`    | No               | —                                          | Comma-separated allowed CORS origins                                                                                                              |
| `TRANSCEND_MCP_SESSION_TTL_MS`  | No               | `1800000`                                  | Idle session timeout (ms)                                                                                                                         |

### MCP client configuration (stdio)

`npx` runs the package’s `transcend-mcp` binary (see `bin` in `package.json`). Add to your MCP client config (for example Claude Desktop or Cursor):

```json
{
  "mcpServers": {
    "transcend": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp"],
      "env": {
        "TRANSCEND_OAUTH_ISSUER": "https://api.transcend.io",
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "5555"
      }
    }
  }
}
```

When developing in this repository, reuse the same variable names from root **`secret.env`** in the `env` block, or use your client’s env-file support if it has one.

### Run from the monorepo

1. **Credentials** — From the repository root, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** and set `TRANSCEND_OAUTH_ISSUER`, `TRANSCEND_OAUTH_CLIENT_ID`, `TRANSCEND_OAUTH_CLIENT_SECRET`, and `TRANSCEND_OAUTH_REDIRECT_PORT` (and optional URL overrides).

2. **Build and run** — `node ./dist/cli.mjs` matches the `transcend-mcp` `bin` (use `node` because `pnpm exec transcend-mcp` may not resolve this package’s own binary in a pnpm workspace):

```bash
# from the repository root — builds the unified server, all domain packages, and mcp-server-base
pnpm exec turbo run build --filter="@transcend-io/mcp..."
set -a && source ./secret.env && set +a
pnpm -F @transcend-io/mcp exec node ./dist/cli.mjs
```

**Alternative:** `./scripts/mcp-run.sh ./packages/mcp/mcp/dist/cli.mjs` (sources `secret.env` when present; run after build).

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

## Architecture

This package composes all domain MCP packages via `ToolRegistry`, which aggregates tools from each domain (`getConsentTools`, `getDSRTools`, etc.) into a single tool namespace. A composed `TranscendGraphQLClient` mixes in all domain GraphQL capabilities so each tool has access to the API surface it needs.

If 73 tools is too many for your AI agent, install individual domain packages instead — see the [MCP section of the root README](../../../README.md#mcp-servers).

## Related packages

| Package                                | Binary                      | Domain                            |
| -------------------------------------- | --------------------------- | --------------------------------- |
| `@transcend-io/mcp-server-admin`       | `transcend-mcp-admin`       | Organization, users, API keys     |
| `@transcend-io/mcp-server-assessment`  | `transcend-mcp-assessment`  | Privacy assessments               |
| `@transcend-io/mcp-server-consent`     | `transcend-mcp-consent`     | Consent management, cookie triage |
| `@transcend-io/mcp-server-base`        | —                           | Shared infrastructure             |
| `@transcend-io/mcp-server-discovery`   | `transcend-mcp-discovery`   | Data discovery, classification    |
| `@transcend-io/mcp-server-dsr`         | `transcend-mcp-dsr`         | Data subject requests             |
| `@transcend-io/mcp-server-inventory`   | `transcend-mcp-inventory`   | Data inventory, silos, vendors    |
| `@transcend-io/mcp-server-preferences` | `transcend-mcp-preferences` | Privacy preferences               |
| `@transcend-io/mcp-server-workflows`   | `transcend-mcp-workflows`   | Workflow configuration            |
