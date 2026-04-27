# @transcend-io/mcp-server-assessment

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for privacy assessments. Provides tools for creating, managing, and completing privacy impact assessments and assessment templates.

Requires **Node.js ≥ 22.12** (see `engines` in `package.json`).

For local runs from this repository, copy [`secret.env.example`](../../../secret.env.example) to **`secret.env`** at the repo root (gitignored) and set your API key (see **Run from the monorepo**).

## Install

When the package is available on npm, install the CLI globally:

```bash
npm install -g @transcend-io/mcp-server-assessment
```

Until then, run from a checkout of this repository (see **Run from the monorepo** below).

## Usage

```bash
# With TRANSCEND_API_KEY in the environment; from the monorepo use secret.env (see Run from the monorepo)
TRANSCEND_API_KEY=your-api-key transcend-mcp-assessment
```

The process speaks MCP over **stdio** and is meant to be launched by an MCP client (for example Cursor or Claude Desktop), not used as an interactive shell.

### MCP client configuration

`npx` runs the package’s `transcend-mcp-assessment` binary (see `bin` in `package.json`).

```json
{
  "mcpServers": {
    "transcend-assessments": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-assessment"],
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

| Variable            | Required | Default                                    | Description                                        |
| ------------------- | -------- | ------------------------------------------ | -------------------------------------------------- |
| `TRANSCEND_API_KEY` | Yes      | —                                          | Transcend API key                                  |
| `TRANSCEND_API_URL` | No       | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI convention)   |
| `SOMBRA_URL`        | No       | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention) |

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

Also available as part of the unified [`@transcend-io/mcp`](../mcp/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
