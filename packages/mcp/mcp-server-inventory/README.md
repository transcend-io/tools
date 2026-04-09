# @transcend-io/mcp-server-inventory

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for data inventory management. Provides tools for managing data silos (integrations), data points, vendors, categories, and identifiers.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

## Install

When the package is available on npm, install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-inventory
```

Until then, run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
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

### Run from the monorepo

After `build`, start the server with `node ./dist/cli.mjs` (same entry as the `transcend-mcp-inventory` `bin`; use `node` because in a pnpm workspace `pnpm exec transcend-mcp-inventory` may not resolve this package’s own binary):

```bash
# from the repository root
pnpm exec turbo run build --filter="@transcend-io/mcp-server-inventory..."
TRANSCEND_API_KEY=your-api-key pnpm -F @transcend-io/mcp-server-inventory exec node ./dist/cli.mjs
```

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable                | Required | Default                                    | Description       |
| ----------------------- | -------- | ------------------------------------------ | ----------------- |
| `TRANSCEND_API_KEY`     | Yes      | —                                          | Transcend API key |
| `TRANSCEND_API_URL`     | No       | `https://multi-tenant.sombra.transcend.io` | Sombra API URL    |
| `TRANSCEND_GRAPHQL_URL` | No       | `https://api.transcend.io`                 | GraphQL API URL   |

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

Also available as part of the unified [`@transcend-io/mcp-server`](../mcp-server/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
