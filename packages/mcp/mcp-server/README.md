# @transcend-io/mcp-server

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Unified Transcend MCP Server that combines all domain tools into a single server. This is the "everything in one place" option — install this package when you want access to all 70+ Transcend tools at once.

## Install

```bash
npm install -g @transcend-io/mcp-server
```

## Usage

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp
```

### Environment variables

| Variable                | Required | Default                                    | Description       |
| ----------------------- | -------- | ------------------------------------------ | ----------------- |
| `TRANSCEND_API_KEY`     | Yes      | —                                          | Transcend API key |
| `TRANSCEND_API_URL`     | No       | `https://multi-tenant.sombra.transcend.io` | Sombra API URL    |
| `TRANSCEND_GRAPHQL_URL` | No       | `https://api.transcend.io`                 | GraphQL API URL   |

### MCP client configuration

Add to your MCP client config (e.g. Claude Desktop, Cursor):

```json
{
  "mcpServers": {
    "transcend": {
      "command": "npx",
      "args": ["-y", "@transcend-io/mcp-server"],
      "env": {
        "TRANSCEND_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Architecture

This package composes all domain MCP packages via `ToolRegistry`, which aggregates tools from each domain (`getConsentTools`, `getDSRTools`, etc.) into a single tool namespace. A composed `TranscendGraphQLClient` mixes in all domain GraphQL capabilities so each tool has access to the API surface it needs.

If 70+ tools is too many for your AI agent, install individual domain packages instead — see the [MCP section of the root README](../../../README.md#mcp-servers).

## Related packages

| Package                                | Binary                      | Domain                            |
| -------------------------------------- | --------------------------- | --------------------------------- |
| `@transcend-io/mcp-server-admin`       | `transcend-mcp-admin`       | Organization, users, API keys     |
| `@transcend-io/mcp-server-assessments` | `transcend-mcp-assessments` | Privacy assessments               |
| `@transcend-io/mcp-server-consent`     | `transcend-mcp-consent`     | Consent management, cookie triage |
| `@transcend-io/mcp-server-core`        | —                           | Shared infrastructure             |
| `@transcend-io/mcp-server-discovery`   | `transcend-mcp-discovery`   | Data discovery, classification    |
| `@transcend-io/mcp-server-dsr`         | `transcend-mcp-dsr`         | Data subject requests             |
| `@transcend-io/mcp-server-inventory`   | `transcend-mcp-inventory`   | Data inventory, silos, vendors    |
| `@transcend-io/mcp-server-preferences` | `transcend-mcp-preferences` | Privacy preferences               |
| `@transcend-io/mcp-server-workflows`   | `transcend-mcp-workflows`   | Workflow configuration            |
