# @transcend-io/mcp-server-dsr

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for data subject requests (DSR). Provides tools for submitting, tracking, and responding to privacy requests such as access, erasure, and opt-out.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set the OAuth environment variables (see **Run from the monorepo**).

## Install

Install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-dsr
```

Or run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
# With OAuth env vars in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_OAUTH_ISSUER=https://api.transcend.io \
TRANSCEND_OAUTH_CLIENT_ID=your-client-id \
TRANSCEND_OAUTH_CLIENT_SECRET=your-client-secret \
TRANSCEND_OAUTH_REDIRECT_PORT=5555 \
transcend-mcp-dsr
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

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

### MCP client configuration

`npx` runs the package’s `transcend-mcp-dsr` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-dsr": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-dsr"],
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

2. **Build and run** — `node ./dist/cli.mjs` matches the `transcend-mcp-dsr` `bin` (use `node` because `pnpm exec transcend-mcp-dsr` may not resolve this package’s own binary in a pnpm workspace):

```bash
# from the repository root
pnpm exec turbo run build --filter="@transcend-io/mcp-server-dsr..."
set -a && source ./secret.env && set +a
pnpm -F @transcend-io/mcp-server-dsr exec node ./dist/cli.mjs
```

**Alternative:** `./scripts/mcp-run.sh ./packages/mcp/mcp-server-dsr/dist/cli.mjs` (sources `secret.env` when present; run after build).

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable                        | Required | Default                                    | Description                                                                                           |
| ------------------------------- | -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `TRANSCEND_OAUTH_ISSUER`        | Yes      | —                                          | OAuth authorization server URL                                                                        |
| `TRANSCEND_OAUTH_CLIENT_ID`     | Yes      | —                                          | Client ID from [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients) |
| `TRANSCEND_OAUTH_CLIENT_SECRET` | Yes      | —                                          | Client secret from the same OAuth clients page                                                        |
| `TRANSCEND_OAUTH_REDIRECT_PORT` | Yes      | —                                          | Localhost port for the OAuth callback server; **must match the port in your registered redirect URI** |
| `TRANSCEND_OAUTH_REDIRECT_HOST` | No       | `127.0.0.1`                                | Loopback host for the OAuth callback (`127.0.0.1` or `::1` for `http://[::1]:{port}/callback`)        |
| `TRANSCEND_API_URL`             | No       | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI convention)                                                      |
| `SOMBRA_URL`                    | No       | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention)                                                    |

**Monorepo:** keep these in root **`secret.env`** (from [`secret.env.example`](../../../secret.env.example)); see **Run from the monorepo**.

## Tools

- `dsr_list` — List data subject requests
- `dsr_get_details` — Get request details
- `dsr_submit` — Submit a new DSR
- `dsr_submit_on_behalf` — Submit a DSR as an admin on behalf of a data subject
- `dsr_cancel` — Cancel a request
- `dsr_respond_access` — Respond to an access request
- `dsr_respond_erasure` — Respond to an erasure request
- `dsr_poll_status` — Poll request status
- `dsr_analyze` — Analyze DSR data
- `dsr_download_keys` — Download encryption keys
- `dsr_enrich_identifiers` — Enrich request identifiers
- `dsr_list_identifiers` — List identifier types

## Related packages

Also available as part of the unified [`@transcend-io/mcp`](../mcp/README.md), which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
