# @transcend-io/mcp-server-assessments

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for privacy assessments. Provides tools for creating, managing, and completing privacy impact assessments and assessment templates.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

## Install

When the package is available on npm, install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-assessments
```

Until then, run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-assessments
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### MCP client configuration

`npx` runs the package’s `transcend-mcp-assessments` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-assessments": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-assessments"],
      "env": {
        "TRANSCEND_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Run from the monorepo

After `build`, start the server with `node ./dist/cli.mjs` (same entry as the `transcend-mcp-assessments` `bin`; use `node` because in a pnpm workspace `pnpm exec transcend-mcp-assessments` may not resolve this package’s own binary):

```bash
# from the repository root
pnpm exec turbo run build --filter="@transcend-io/mcp-server-assessments..."
TRANSCEND_API_KEY=your-api-key pnpm -F @transcend-io/mcp-server-assessments exec node ./dist/cli.mjs
```

See [CONTRIBUTING.md](../../../CONTRIBUTING.md#mcp-servers) for workspace layout and `pnpm --filter` workflows.

### Environment variables

| Variable                | Required | Default                                    | Description       |
| ----------------------- | -------- | ------------------------------------------ | ----------------- |
| `TRANSCEND_API_KEY`     | Yes      | —                                          | Transcend API key |
| `TRANSCEND_API_URL`     | No       | `https://multi-tenant.sombra.transcend.io` | Sombra API URL    |
| `TRANSCEND_GRAPHQL_URL` | No       | `https://api.transcend.io`                 | GraphQL API URL   |

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

Also available as part of the unified [`@transcend-io/mcp-server`](../mcp-server/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
