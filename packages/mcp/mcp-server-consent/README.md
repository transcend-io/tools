# @transcend-io/mcp-server-consent

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for consent management. Provides tools for managing consent preferences, cookie triage, data flow management, and consent regime configuration.

## Install

```bash
npm install -g @transcend-io/mcp-server-consent
```

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-consent
```

### MCP client configuration

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
