# @transcend-io/mcp-server-admin

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for organization administration. Provides tools for managing users, teams, API keys, and organization settings.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set the OAuth environment variables (see **Run from the monorepo**).

## Install

Install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-admin
```

Or run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
# With OAuth env vars in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_OAUTH_CLIENT_ID=your-client-id \
TRANSCEND_OAUTH_CLIENT_SECRET=your-client-secret \
TRANSCEND_OAUTH_REDIRECT_PORT=your-client-redirect-port \
transcend-mcp-admin
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### OAuth client setup

OAuth stdio is the recommended path for MCP clients (Cursor, Claude Desktop). Requires **org admin** access to create OAuth clients.

1. Navigate to [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients) and create an OAuth client.
2. Copy the **client ID** and **client secret**.
3. Register `http://127.0.0.1:{port}/callback` — use **`127.0.0.1`, not `localhost`**, and ensure the path is `/callback`. Set `TRANSCEND_OAUTH_REDIRECT_PORT` to the matching port.

At startup the server verifies client ID, secret, and redirect URI. On first tool call it opens a browser for login. Tokens are session-only (in-memory).

**OAuth scopes:** `ViewEmployees`, `ViewApiKeys`, `ManageApiKeys`. The signed-in user must hold these permissions. See [`src/scopes.ts`](./src/scopes.ts).

Full setup, troubleshooting, and multi-server guidance: [MCP root README](../README.md#oauth-client-setup).

> **API key alternative:** set `TRANSCEND_API_KEY` instead of OAuth vars for stdio (OAuth is disabled when both are set).

### MCP client configuration

`npx` runs the package’s `transcend-mcp-admin` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-admin": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-admin"],
      "env": {
        "TRANSCEND_OAUTH_CLIENT_ID": "your-client-id",
        "TRANSCEND_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TRANSCEND_OAUTH_REDIRECT_PORT": "your-client-redirect-port"
      }
    }
  }
}
```

When developing in this repository, reuse the same variable names from root **`secret.env`** in the `env` block, or use your client’s env-file support if it has one.

### Run from the monorepo

1. **Credentials** — From the repository root, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** and set `TRANSCEND_OAUTH_CLIENT_ID`, `TRANSCEND_OAUTH_CLIENT_SECRET`, and `TRANSCEND_OAUTH_REDIRECT_PORT` (and optional URL overrides).

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

| Variable                        | Required (stdio OAuth) | Default                                    | Description                                                                                           |
| ------------------------------- | ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `TRANSCEND_OAUTH_CLIENT_ID`     | Yes                    | —                                          | Client ID from [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients) |
| `TRANSCEND_OAUTH_CLIENT_SECRET` | Yes                    | —                                          | Client secret from the same OAuth clients page                                                        |
| `TRANSCEND_OAUTH_REDIRECT_PORT` | Yes                    | —                                          | Localhost port for the OAuth callback server; **must match the port in your registered redirect URI** |
| `TRANSCEND_OAUTH_REDIRECT_HOST` | No                     | `127.0.0.1`                                | Loopback host for the OAuth callback (`127.0.0.1` or `::1` for `http://[::1]:{port}/callback`)        |
| `TRANSCEND_OAUTH_ISSUER`        | No                     | auto-detected                              | OAuth issuer URL; production auto-detects region. Test-only override                                  |
| `TRANSCEND_API_KEY`             | No                     | —                                          | API key for stdio (alternative to OAuth). Disables OAuth when set alongside client ID                 |
| `TRANSCEND_API_URL`             | No                     | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI convention)                                                      |
| `SOMBRA_URL`                    | No                     | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention)                                                    |

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
