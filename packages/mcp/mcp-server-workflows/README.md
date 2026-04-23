# @transcend-io/mcp-server-workflows

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for workflow configuration. Provides tools for listing workflows, email templates, and updating workflow settings.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set your API key (see **Run from the monorepo**).

## Install

When the package is available on npm, install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-workflows
```

Until then, run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
# With TRANSCEND_API_KEY in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_API_KEY=your-api-key transcend-mcp-workflows
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### MCP client configuration

`npx` runs the package’s `transcend-mcp-workflows` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-workflows": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-workflows"],
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

2. **Build and run** — `node ./dist/cli.mjs` matches the `transcend-mcp-workflows` `bin` (use `node` because `pnpm exec transcend-mcp-workflows` may not resolve this package’s own binary in a pnpm workspace):

```bash
# from the repository root
pnpm exec turbo run build --filter="@transcend-io/mcp-server-workflows..."
set -a && source ./secret.env && set +a
pnpm -F @transcend-io/mcp-server-workflows exec node ./dist/cli.mjs
```

**Alternative:** `./scripts/mcp-run.sh ./packages/mcp/mcp-server-workflows/dist/cli.mjs` (sources `secret.env` when present; run after build).

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable                | Required | Default                                    | Description       |
| ----------------------- | -------- | ------------------------------------------ | ----------------- |
| `TRANSCEND_API_KEY`     | Yes      | —                                          | Transcend API key |
| `TRANSCEND_API_URL`     | No       | `https://multi-tenant.sombra.transcend.io` | Sombra API URL    |
| `TRANSCEND_GRAPHQL_URL` | No       | `https://api.transcend.io`                 | GraphQL API URL   |

**Monorepo:** keep these in root **`secret.env`** (from [`secret.env.example`](../../../secret.env.example)); see **Run from the monorepo**.

## Tools

- `workflows_list` — List workflows
- `workflows_list_email_templates` — List email templates
- `workflows_update_config` — Update workflow configuration

## Related packages

Also available as part of the unified [`@transcend-io/mcp`](../mcp/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
