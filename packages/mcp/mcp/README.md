# @transcend-io/mcp

> **Beta** — this package is under active development. APIs may change without notice.

Unified Transcend MCP Server that combines all domain tools into a single server. This is the "everything in one place" option — install this package when you want access to all 70+ Transcend tools at once.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set your API key (see **Run from the monorepo**). The key must be created with **MCP** enabled in the Transcend dashboard (a toggle when you create the key).

## Install

Install the CLI globally:

```bash
npm install -g @transcend-io/mcp
```

Or run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

### stdio (local, default)

```bash
# With TRANSCEND_API_KEY in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_API_KEY=your-api-key transcend-mcp
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### HTTP (remote hosting)

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp --transport http --port 3000
```

This starts a Streamable HTTP server at `http://127.0.0.1:3000/mcp` with a health check at `/health`. See [DEPLOYMENT.md](../DEPLOYMENT.md) for Docker, reverse proxy, and production deployment patterns.

### Environment variables

| Variable                       | Required    | Default                                    | Description                                                                                                                                       |
| ------------------------------ | ----------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSCEND_API_KEY`            | Yes (stdio) | —                                          | Transcend API key with **MCP** enabled when created in the dashboard (HTTP: fallback if no header)                                                |
| `TRANSCEND_API_URL`            | No          | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI convention)                                                                                                  |
| `SOMBRA_URL`                   | No          | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention)                                                                                                |
| `TRANSCEND_DASHBOARD_URL`      | No          | `https://app.transcend.io`                 | Override the admin-dashboard base URL used for deep links returned by tool responses. Intended for local development against staging / fake hosts |
| `TRANSCEND_HTTP_PORT`          | No          | `3000`                                     | HTTP listen port                                                                                                                                  |
| `TRANSCEND_HTTP_HOST`          | No          | `127.0.0.1`                                | HTTP listen host                                                                                                                                  |
| `TRANSCEND_MCP_CORS_ORIGINS`   | No          | —                                          | Comma-separated allowed CORS origins                                                                                                              |
| `TRANSCEND_MCP_SESSION_TTL_MS` | No          | `1800000`                                  | Idle session timeout (ms)                                                                                                                         |

### MCP client configuration (stdio)

`npx` runs the package’s `transcend-mcp` binary (see `bin` in `package.json`). Add to your MCP client config (for example Claude Desktop or Cursor):

```json
{
  "mcpServers": {
    "transcend": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp"],
      "env": {
        "TRANSCEND_API_KEY": "your-api-key"
      }
    }
  }
}
```

When developing in this repository, reuse the same variable names from root **`secret.env`** in the `env` block, or use your client’s env-file support if it has one.

### Run from the monorepo

1. **Credentials** — From the repository root, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** and set `TRANSCEND_API_KEY` (and optional URL overrides).

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

If 70+ tools is too many for your AI agent, install individual domain packages instead — see the [MCP section of the root README](../../../README.md#mcp-servers).

## Output schemas and `structuredContent`

Every tool exposes a Zod-derived JSON Schema as `outputSchema` in `tools/list`, and every `CallToolResult` includes `structuredContent` populated with the validated handler return value, alongside the existing `content[0].text` JSON payload. Payloads use a single envelope (`{ success, data, timestamp }` on success); list tools nest pagination metadata under `data`.

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
