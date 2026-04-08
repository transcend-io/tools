# @transcend-io/mcp-server-preferences

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for privacy preference management. Provides tools for querying, upserting, and deleting user privacy preference records and their identifiers.

## Install

```bash
npm install -g @transcend-io/mcp-server-preferences
```

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-preferences
```

### MCP client configuration

```json
{
  "mcpServers": {
    "transcend-preferences": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-preferences"],
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

- `preferences_query` — Query preference records
- `preferences_upsert` — Create or update a preference record
- `preferences_delete` — Delete a preference record
- `preferences_append_identifiers` — Append identifiers to a record
- `preferences_update_identifiers` — Update identifiers on a record
- `preferences_delete_identifiers` — Delete identifiers from a record

## Related packages

Also available as part of the unified [`@transcend-io/mcp-server`](../mcp-server/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
