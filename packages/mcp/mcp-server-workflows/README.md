# @transcend-io/mcp-server-workflows

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for workflow configuration. Provides tools for listing workflows, email templates, and updating workflow settings.

## Install

```bash
npm install -g @transcend-io/mcp-server-workflows
```

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-workflows
```

### MCP client configuration

```json
{
  "mcpServers": {
    "transcend-workflows": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-workflows"],
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

- `workflows_list` — List workflows
- `workflows_list_email_templates` — List email templates
- `workflows_update_config` — Update workflow configuration

## Related packages

Also available as part of the unified [`@transcend-io/mcp-server`](../mcp-server/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
