# @transcend-io/mcp-server-inventory

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for data inventory management. Provides tools for managing data silos (integrations), data points, vendors, categories, and identifiers.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set your API key (see **Run from the monorepo**).

## Install

Install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-inventory
```

Or run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
# With TRANSCEND_API_KEY in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_API_KEY=your-api-key transcend-mcp-inventory
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### MCP client configuration

`npx` runs the package’s `transcend-mcp-inventory` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-inventory": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-inventory"],
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

2. **Build and run** — `node ./dist/cli.mjs` matches the `transcend-mcp-inventory` `bin` (use `node` because `pnpm exec transcend-mcp-inventory` may not resolve this package’s own binary in a pnpm workspace):

```bash
# from the repository root
pnpm exec turbo run build --filter="@transcend-io/mcp-server-inventory..."
set -a && source ./secret.env && set +a
pnpm -F @transcend-io/mcp-server-inventory exec node ./dist/cli.mjs
```

**Alternative:** `./scripts/mcp-run.sh ./packages/mcp/mcp-server-inventory/dist/cli.mjs` (sources `secret.env` when present; run after build).

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable            | Required | Default                                    | Description                                        |
| ------------------- | -------- | ------------------------------------------ | -------------------------------------------------- |
| `TRANSCEND_API_KEY` | Yes      | —                                          | Transcend API key                                  |
| `TRANSCEND_API_URL` | No       | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI convention)   |
| `SOMBRA_URL`        | No       | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention) |

**Monorepo:** keep these in root **`secret.env`** (from [`secret.env.example`](../../../secret.env.example)); see **Run from the monorepo**.

## Tools

- `inventory_list_data_silos` — List data silos (integrations)
- `inventory_get_data_silo` — Get data silo details
- `inventory_create_data_silo` — Create a data silo
- `inventory_update_data_silo` — Update a data silo
- `inventory_list_data_points` — List data points
- `inventory_list_sub_data_points` — List sub-data points
- `inventory_list_categories` — List data categories
- `inventory_list_identifiers` — List identifiers
- `inventory_list_vendors` — List vendors
- `inventory_analyze` — Analyze inventory data

## Related packages

Also available as part of the unified [`@transcend-io/mcp`](../mcp/README.md), which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
