# @transcend-io/mcp-server-discovery

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for data discovery. Provides tools for scanning, classifying, and extracting entities from data.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

## Install

When the package is available on npm, install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-discovery
```

Until then, run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-discovery
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### MCP client configuration

`npx` runs the package’s `transcend-mcp-discovery` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-discovery": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-discovery"],
      "env": {
        "TRANSCEND_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Run from the monorepo

After `build`, start the server with `node ./dist/cli.mjs` (same entry as the `transcend-mcp-discovery` `bin`; use `node` because in a pnpm workspace `pnpm exec transcend-mcp-discovery` may not resolve this package’s own binary):

```bash
# from the repository root
pnpm exec turbo run build --filter="@transcend-io/mcp-server-discovery..."
TRANSCEND_API_KEY=your-api-key pnpm -F @transcend-io/mcp-server-discovery exec node ./dist/cli.mjs
```

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable                | Required | Default                                    | Description       |
| ----------------------- | -------- | ------------------------------------------ | ----------------- |
| `TRANSCEND_API_KEY`     | Yes      | —                                          | Transcend API key |
| `TRANSCEND_API_URL`     | No       | `https://multi-tenant.sombra.transcend.io` | Sombra API URL    |
| `TRANSCEND_GRAPHQL_URL` | No       | `https://api.transcend.io`                 | GraphQL API URL   |

## Tools

- `discovery_list_scans` — List data discovery scans
- `discovery_get_scan` — Get scan details
- `discovery_start_scan` — Start a new scan
- `discovery_list_plugins` — List discovery plugins
- `discovery_classify_text` — Classify text into data categories
- `discovery_ner_extract` — Extract named entities from text

## Related packages

Also available as part of the unified [`@transcend-io/mcp-server`](../mcp-server/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
