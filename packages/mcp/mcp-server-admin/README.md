# @transcend-io/mcp-server-admin

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for organization administration. Provides tools for managing users, teams, API keys, and organization settings.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set your API key (see **Run from the monorepo**). The key must be created with **MCP** enabled in the Transcend dashboard (a toggle when you create the key).

## Install

Install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-admin
```

Or run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
# With TRANSCEND_API_KEY in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_API_KEY=your-api-key transcend-mcp-admin
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### MCP client configuration

`npx` runs the package’s `transcend-mcp-admin` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-admin": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-admin"],
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

2. **Build and run** — `node ./dist/cli.mjs` matches the `transcend-mcp-admin` `bin` (use `node` because `pnpm exec transcend-mcp-admin` may not resolve this package’s own binary in a pnpm workspace):

```bash
# from the repository root
pnpm exec turbo run build --filter="@transcend-io/mcp-server-admin..."
set -a && source ./secret.env && set +a
pnpm -F @transcend-io/mcp-server-admin exec node ./dist/cli.mjs
```

**Alternative:** `./scripts/mcp-run.sh ./packages/mcp/mcp-server-admin/dist/cli.mjs` (sources `secret.env` when present; run after build).

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable            | Required | Default                                    | Description                                        |
| ------------------- | -------- | ------------------------------------------ | -------------------------------------------------- |
| `TRANSCEND_API_KEY` | Yes      | —                                          | Transcend API key                                  |
| `TRANSCEND_API_URL` | No       | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI convention)   |
| `SOMBRA_URL`        | No       | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention) |

**Monorepo:** keep these in root **`secret.env`** (from [`secret.env.example`](../../../secret.env.example)); see **Run from the monorepo**.

## Tools

- `admin_test_connection` — Test API connectivity
- `admin_get_current_user` — Get the authenticated user
- `admin_get_organization` — Get organization details
- `admin_get_privacy_center` — Get privacy center configuration
- `admin_list_users` — List organization users
- `admin_list_teams` — List teams
- `admin_list_api_keys` — List API keys
- `admin_create_api_key` — Create a new API key

## Related packages

Also available as part of the unified [`@transcend-io/mcp`](../mcp/README.md), which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
