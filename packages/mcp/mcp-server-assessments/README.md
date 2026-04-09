# @transcend-io/mcp-server-assessments

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for privacy assessments. Provides tools for creating, managing, and completing privacy impact assessments and assessment templates.

## Install

```bash
npm install -g @transcend-io/mcp-server-assessments
```

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-assessments
```

### MCP client configuration

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
