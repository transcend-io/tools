# @transcend-io/mcp-server-assessment

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for privacy assessments. Provides tools for creating, managing, and completing privacy impact assessments and assessment templates.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set the OAuth environment variables (see **Run from the monorepo**).

## Install

Install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-assessment
```

Or run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
# With OAuth env vars in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_OAUTH_ISSUER=https://api.transcend.io \
TRANSCEND_OAUTH_CLIENT_ID=your-client-id \
TRANSCEND_OAUTH_CLIENT_SECRET=your-client-secret \
TRANSCEND_OAUTH_REDIRECT_PORT=5555 \
transcend-mcp-assessment
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

`npx` runs the package’s `transcend-mcp-assessment` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-assessments": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-assessment"],
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

2. **Build and run** — `node ./dist/cli.mjs` matches the `transcend-mcp-assessment` `bin` (use `node` because `pnpm exec transcend-mcp-assessment` may not resolve this package’s own binary in a pnpm workspace):

```bash
# from the repository root
pnpm exec turbo run build --filter="@transcend-io/mcp-server-assessment..."
set -a && source ./secret.env && set +a
pnpm -F @transcend-io/mcp-server-assessment exec node ./dist/cli.mjs
```

**Alternative:** `./scripts/mcp-run.sh ./packages/mcp/mcp-server-assessment/dist/cli.mjs` (sources `secret.env` when present; run after build).

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable                        | Required | Default                                    | Description                                                                                                                                       |
| ------------------------------- | -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRANSCEND_OAUTH_ISSUER`        | Yes      | —                                          | OAuth authorization server URL                                                                                                                    |
| `TRANSCEND_OAUTH_CLIENT_ID`     | Yes      | —                                          | Client ID from [app.transcend.com/admin/oauth-clients](https://app.transcend.com/admin/oauth-clients)                                             |
| `TRANSCEND_OAUTH_CLIENT_SECRET` | Yes      | —                                          | Client secret from the same OAuth clients page                                                                                                    |
| `TRANSCEND_OAUTH_REDIRECT_PORT` | Yes      | —                                          | Localhost port for the OAuth callback server; **must match the port in your registered redirect URI**                                             |
| `TRANSCEND_OAUTH_REDIRECT_HOST` | No       | `127.0.0.1`                                | Loopback host for the OAuth callback (`127.0.0.1` or `::1` for `http://[::1]:{port}/callback`)                                                    |
| `TRANSCEND_API_URL`             | No       | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI convention)                                                                                                  |
| `SOMBRA_URL`                    | No       | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention)                                                                                                |
| `TRANSCEND_DASHBOARD_URL`       | No       | `https://app.transcend.io`                 | Override the admin-dashboard base URL used for deep links returned by tool responses. Intended for local development against staging / fake hosts |

**Monorepo:** keep these in root **`secret.env`** (from [`secret.env.example`](../../../secret.env.example)); see **Run from the monorepo**.

## Tools

- `assessments_list` — List assessments with filtering
- `assessments_get` — Get assessment details
- `assessments_create` — Create a new assessment
- `assessments_update` — Update an assessment
- `assessments_update_assignees` — Update assessment assignees
- `assessments_answer_question` — Answer an assessment question
- `assessments_submit_response` — Submit an assessment for review
- `assessments_prefill` — Pre-fill assessment answers
- `assessments_add_section` — Add a section to an assessment
- `assessments_list_templates` — List assessment templates
- `assessments_create_template` — Create an assessment template
- `assessments_export_template` — Export an assessment template
- `assessments_list_groups` — List assessment groups
- `assessments_create_group` — Create an assessment group

## Related packages

Also available as part of the unified [`@transcend-io/mcp`](../mcp/README.md), which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
