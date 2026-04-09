# @transcend-io/mcp-server-consent

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for consent management. Provides tools for managing consent preferences, cookie triage, data flow management, and consent regime configuration.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

## Install

When the package is available on npm, install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-consent
```

Until then, run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-consent
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### MCP client configuration

`npx` runs the package’s `transcend-mcp-consent` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-consent": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-consent"],
      "env": {
        "TRANSCEND_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Run from the monorepo

After `build`, start the server with `node ./dist/cli.mjs` (same entry as the `transcend-mcp-consent` `bin`; use `node` because in a pnpm workspace `pnpm exec transcend-mcp-consent` may not resolve this package’s own binary):

```bash
# from the repository root — builds this package and its dependencies (e.g. mcp-server-core)
pnpm exec turbo run build --filter="@transcend-io/mcp-server-consent..."
TRANSCEND_API_KEY=your-api-key pnpm -F @transcend-io/mcp-server-consent exec node ./dist/cli.mjs
```

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable                | Required | Default                                    | Description       |
| ----------------------- | -------- | ------------------------------------------ | ----------------- |
| `TRANSCEND_API_KEY`     | Yes      | —                                          | Transcend API key |
| `TRANSCEND_API_URL`     | No       | `https://multi-tenant.sombra.transcend.io` | Sombra API URL    |
| `TRANSCEND_GRAPHQL_URL` | No       | `https://api.transcend.io`                 | GraphQL API URL   |

## Tools

- `consent_get_preferences` — Get consent preferences for a user
- `consent_set_preferences` — Set consent preferences
- `consent_list_purposes` — List tracking purposes
- `consent_list_data_flows` — List data flows
- `consent_list_airgap_bundles` — List Airgap bundles
- `consent_list_regimes` — List consent regimes
- `consent_list_triage_cookies` — List cookies for triage
- `consent_list_triage_data_flows` — List data flows for triage
- `consent_get_triage_stats` — Get cookie/data flow triage statistics
- `consent_update_cookies` — Update cookies (approve, junk, assign purposes)
- `consent_update_data_flows` — Update data flows
- `consent_bulk_triage` — Bulk approve or junk cookies and data flows

## Related packages

Also available as part of the unified [`@transcend-io/mcp-server`](../mcp-server/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
