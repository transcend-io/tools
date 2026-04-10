# @transcend-io/mcp-server

> **Alpha** — this package is under active development and has not yet been published to npm. APIs may change without notice.

Unified Transcend MCP Server that combines all domain tools into a single server. This is the "everything in one place" option — install this package when you want access to all 70+ Transcend tools at once.

## Install

```bash
npm install -g @transcend-io/mcp-server
```

## Usage

### stdio (local, default)

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp
```

### HTTP (remote hosting)

```bash
TRANSCEND_API_KEY=your-api-key transcend-mcp --transport http --port 3000
```

This starts a Streamable HTTP server at `http://127.0.0.1:3000/mcp` with a health check at `/health`. See [DEPLOYMENT.md](../DEPLOYMENT.md) for Docker, reverse proxy, and production deployment patterns.

### Environment variables

| Variable                       | Required    | Default                                    | Description                                     |
| ------------------------------ | ----------- | ------------------------------------------ | ----------------------------------------------- |
| `TRANSCEND_API_KEY`            | Yes (stdio) | —                                          | Transcend API key (HTTP: fallback if no header) |
| `TRANSCEND_API_URL`            | No          | `https://multi-tenant.sombra.transcend.io` | Sombra API URL                                  |
| `TRANSCEND_GRAPHQL_URL`        | No          | `https://api.transcend.io`                 | GraphQL API URL                                 |
| `TRANSCEND_HTTP_PORT`          | No          | `3000`                                     | HTTP listen port                                |
| `TRANSCEND_HTTP_HOST`          | No          | `127.0.0.1`                                | HTTP listen host                                |
| `TRANSCEND_MCP_CORS_ORIGINS`   | No          | —                                          | Comma-separated allowed CORS origins            |
| `TRANSCEND_MCP_SESSION_TTL_MS` | No          | `1800000`                                  | Idle session timeout (ms)                       |

### MCP client configuration (stdio)

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
