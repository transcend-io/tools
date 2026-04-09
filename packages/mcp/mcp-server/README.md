# @transcend-io/mcp-server

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Unified Transcend MCP Server that combines all domain tools into a single server. This is the "everything in one place" option — install this package when you want access to all 70+ Transcend tools at once.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

## Install

When the package is available on npm, install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server
```

Until then, run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### MCP client configuration

`npx` runs the package’s `transcend-mcp` binary (see `bin` in `package.json`). Add to your MCP client config (for example Claude Desktop or Cursor):

```json
{
  "mcpServers": {
    "transcend": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server"],
      "env": {
        "TRANSCEND_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Run from the monorepo

After `build`, start the server with `node ./dist/cli.mjs` (same entry as the `transcend-mcp` `bin`; use `node` because in a pnpm workspace `pnpm exec transcend-mcp` may not resolve this package’s own binary):

```bash
# from the repository root — builds the unified server, all domain packages, and mcp-server-core
pnpm exec turbo run build --filter="@transcend-io/mcp-server..."
TRANSCEND_API_KEY=your-api-key pnpm -F @transcend-io/mcp-server exec node ./dist/cli.mjs
```

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable                | Required | Default                                    | Description       |
| ----------------------- | -------- | ------------------------------------------ | ----------------- |
| `TRANSCEND_API_KEY`     | Yes      | —                                          | Transcend API key |
| `TRANSCEND_API_URL`     | No       | `https://multi-tenant.sombra.transcend.io` | Sombra API URL    |
| `TRANSCEND_GRAPHQL_URL` | No       | `https://api.transcend.io`                 | GraphQL API URL   |

## Architecture

This package composes all domain MCP packages via `ToolRegistry`, which aggregates tools from each domain (`getConsentTools`, `getDSRTools`, etc.) into a single tool namespace. A composed `TranscendGraphQLClient` mixes in all domain GraphQL capabilities so each tool has access to the API surface it needs.

If 70+ tools is too many for your AI agent, install individual domain packages instead — see the [MCP section of the root README](../../../README.md#mcp-servers).

## Related packages

| Package                                | Binary                      | Domain                            |
| -------------------------------------- | --------------------------- | --------------------------------- |
| `@transcend-io/mcp-server-admin`       | `transcend-mcp-admin`       | Organization, users, API keys     |
| `@transcend-io/mcp-server-assessments` | `transcend-mcp-assessments` | Privacy assessments               |
| `@transcend-io/mcp-server-consent`     | `transcend-mcp-consent`     | Consent management, cookie triage |
| `@transcend-io/mcp-server-core`        | —                           | Shared infrastructure             |
| `@transcend-io/mcp-server-discovery`   | `transcend-mcp-discovery`   | Data discovery, classification    |
| `@transcend-io/mcp-server-dsr`         | `transcend-mcp-dsr`         | Data subject requests             |
| `@transcend-io/mcp-server-inventory`   | `transcend-mcp-inventory`   | Data inventory, silos, vendors    |
| `@transcend-io/mcp-server-preferences` | `transcend-mcp-preferences` | Privacy preferences               |
| `@transcend-io/mcp-server-workflows`   | `transcend-mcp-workflows`   | Workflow configuration            |
