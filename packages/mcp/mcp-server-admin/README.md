# @transcend-io/mcp-server-admin

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for organization administration. Provides tools for managing users, teams, API keys, and organization settings.

## Install

```bash
npm install -g @transcend-io/mcp-server-admin
```

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-admin
```

### MCP client configuration

```json
{
  "mcpServers": {
    "transcend-admin": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-admin"],
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

- `admin_test_connection` — Test API connectivity
- `admin_get_current_user` — Get the authenticated user
- `admin_get_organization` — Get organization details
- `admin_get_privacy_center` — Get privacy center configuration
- `admin_list_users` — List organization users
- `admin_list_teams` — List teams
- `admin_list_api_keys` — List API keys
- `admin_create_api_key` — Create a new API key

## Related packages

Also available as part of the unified [`@transcend-io/mcp-server`](../mcp-server/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
