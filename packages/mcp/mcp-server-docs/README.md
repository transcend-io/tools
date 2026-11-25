# @transcend-io/mcp-server-docs

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for documentation lookup. Provides tools to list articles from the public docs index and fetch full markdown content on demand.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

**Public docs need no authentication.** `docs_list` and `docs_fetch` read public content from `docs.transcend.io` only and never use your Transcend credentials. `docs_integration_lookup` is the one signed-in tool: it reads integration catalog docs with your API key or OAuth sign-in, and asks you to sign in only when it is called.

## Install

Install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-docs
```

Or run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
transcend-mcp-docs
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example, Cursor or Claude Desktop), not used as an interactive shell.

### MCP client configuration

`npx` runs the package’s `transcend-mcp-docs` binary (see `bin` in `package.json`). No `env` block is required.

```json
{
  "mcpServers": {
    "transcend-docs": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-docs"]
    }
  }
}
```

When developing in this repository:

```json
{
  "mcpServers": {
    "transcend-docs-local": {
      "command": "node",
      "args": ["packages/mcp/mcp-server-docs/dist/cli.mjs"]
    }
  }
}
```

Build first: `pnpm exec turbo run build --filter="@transcend-io/mcp-server-docs..."`

### Run from the monorepo

```bash
# from the repository root
pnpm exec turbo run build --filter="@transcend-io/mcp-server-docs..."
pnpm -F @transcend-io/mcp-server-docs exec node ./dist/cli.mjs
```

**Alternative:** `./scripts/mcp-run.sh ./packages/mcp/mcp-server-docs/dist/cli.mjs`. Set `TRANSCEND_API_KEY` or OAuth vars in `secret.env` to sign in for `docs_integration_lookup`; public tools still work without them.

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

## Tools

- `docs_list` — Browse the Transcend docs sections (`llms.txt`), list one section's articles with `section`, or full-text search titles and article bodies with `query` (ranked snippets; then `docs_fetch`), find docs for an Admin Dashboard page with `route` (a route pattern, path, or app URL; then more docs for its product), or list one product's docs with `product`. `route` and `product` can each be combined with `query`
- `docs_integration_lookup` — Signed in only. Read the catalog docs for one integration (connection steps, datapoints, supported actions) by `integration` name or title. A near miss returns close names
- `docs_fetch` — Fetch full markdown for a docs article URL (host restricted to `docs.transcend.io`)

## Related packages

Also available as part of the unified [`@transcend-io/mcp`](../mcp/README.md), which includes all domains and **does** require authentication. See the [root README](../../../README.md#mcp-servers) for the full list.
