# @transcend-io/mcp-server-docs

> **Beta** — this package is under active development. APIs may change without notice.

Transcend MCP Server for documentation lookup. Provides tools to list articles from the public docs index and fetch full markdown content on demand.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

**No authentication required.** This standalone server reads public content from `docs.transcend.io` only. It does not use your Transcend API key or OAuth credentials, even if they are present in the environment (for example when launched via [`scripts/mcp-run.sh`](../../../scripts/mcp-run.sh) with `secret.env` loaded).

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

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

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

**Alternative:** `./scripts/mcp-run.sh ./packages/mcp/mcp-server-docs/dist/cli.mjs` (OAuth vars in `secret.env` are ignored by this server).

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

## Tools

- `transcend_docs_list` — List/search the Transcend docs index (`llms.txt`); optional `section` and `keyword` filters
- `transcend_docs_fetch` — Fetch full markdown for a docs article URL (host restricted to `docs.transcend.io`)

## Related packages

Also available as part of the unified [`@transcend-io/mcp`](../mcp/README.md), which includes all domains and **does** require authentication. See the [root README](../../../README.md#mcp-servers) for the full list.
