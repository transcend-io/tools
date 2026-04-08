# @transcend-io/mcp-server-discovery

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for data discovery. Provides tools for scanning, classifying, and extracting entities from data.

## Install

```bash
npm install -g @transcend-io/mcp-server-discovery
```

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-discovery
```

### MCP client configuration

```json
{
  "mcpServers": {
    "transcend-discovery": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-discovery"],
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

- `discovery_list_scans` — List data discovery scans
- `discovery_get_scan` — Get scan details
- `discovery_start_scan` — Start a new scan
- `discovery_list_plugins` — List discovery plugins
- `discovery_classify_text` — Classify text into data categories
- `discovery_ner_extract` — Extract named entities from text

## Related packages

Also available as part of the unified [`@transcend-io/mcp-server`](../mcp-server/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
