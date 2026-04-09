# @transcend-io/mcp-server-dsr

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Transcend MCP Server for data subject requests (DSR). Provides tools for submitting, tracking, and responding to privacy requests such as access, erasure, and opt-out.

## Install

```bash
npm install -g @transcend-io/mcp-server-dsr
```

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp-dsr
```

### MCP client configuration

```json
{
  "mcpServers": {
    "transcend-dsr": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server-dsr"],
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

- `dsr_list` — List data subject requests
- `dsr_get_details` — Get request details
- `dsr_submit` — Submit a new DSR
- `dsr_employee_submit` — Submit an employee DSR
- `dsr_cancel` — Cancel a request
- `dsr_respond_access` — Respond to an access request
- `dsr_respond_erasure` — Respond to an erasure request
- `dsr_poll_status` — Poll request status
- `dsr_analyze` — Analyze DSR data
- `dsr_download_keys` — Download encryption keys
- `dsr_enrich_identifiers` — Enrich request identifiers
- `dsr_list_identifiers` — List identifier types

## Related packages

Also available as part of the unified [`@transcend-io/mcp-server`](../mcp-server/README.md) which includes all domains. See the [root README](../../../README.md#mcp-servers) for the full list.
