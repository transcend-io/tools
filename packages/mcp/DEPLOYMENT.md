# Deploying Transcend MCP Servers over HTTP

This guide covers running Transcend MCP servers in HTTP mode for remote hosting. For local stdio usage (Claude Desktop, Cursor), see the package READMEs.

## Quick start

```bash
# Start the unified server in HTTP mode
TRANSCEND_API_KEY=your-api-key npx @transcend-io/mcp-server --transport http

# Or a domain server
TRANSCEND_API_KEY=your-api-key npx @transcend-io/mcp-server-consent --transport http
```

The server listens on `http://127.0.0.1:3000/mcp` by default. A health check is available at `http://127.0.0.1:3000/health`.

## Configuration

### CLI flags

| Flag            | Default     | Description                       |
| --------------- | ----------- | --------------------------------- |
| `--transport`   | `stdio`     | Transport type: `stdio` or `http` |
| `--port`        | `3000`      | HTTP listen port                  |
| `--host`        | `127.0.0.1` | HTTP listen host                  |
| `--mcp-path`    | `/mcp`      | MCP JSON-RPC endpoint path        |
| `--cors-origin` | —           | Allowed CORS origin (repeatable)  |

### Environment variables

| Variable                       | Default                                    | Description                                                                     |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------- |
| `TRANSCEND_API_KEY`            | —                                          | Default API key (required for stdio, optional for HTTP if provided per-request) |
| `TRANSCEND_API_URL`            | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL                                                             |
| `TRANSCEND_GRAPHQL_URL`        | `https://api.transcend.io`                 | GraphQL API URL                                                                 |
| `TRANSCEND_HTTP_PORT`          | `3000`                                     | HTTP listen port (overridden by `--port`)                                       |
| `TRANSCEND_HTTP_HOST`          | `127.0.0.1`                                | HTTP listen host (overridden by `--host`)                                       |
| `TRANSCEND_MCP_CORS_ORIGINS`   | —                                          | Comma-separated allowed CORS origins                                            |
| `TRANSCEND_MCP_SESSION_TTL_MS` | `1800000` (30 min)                         | Idle session timeout in milliseconds                                            |

## Authentication

### Default (environment variable)

Set `TRANSCEND_API_KEY` at deploy time. All sessions use this key.

### Per-request override

HTTP mode supports per-request API key override via headers, checked in this order:

1. `Authorization: Bearer <api-key>`
2. `X-Transcend-Api-Key: <api-key>`
3. `TRANSCEND_API_KEY` environment variable (fallback)

This enables multi-tenant deployments where different clients use different API keys without restarting the server.

## Endpoints

| Method   | Path      | Description                                                |
| -------- | --------- | ---------------------------------------------------------- |
| `POST`   | `/mcp`    | JSON-RPC 2.0 requests (initialize, tools/list, tools/call) |
| `GET`    | `/mcp`    | SSE stream for server-to-client notifications              |
| `DELETE` | `/mcp`    | Session termination                                        |
| `GET`    | `/health` | Health check (no session required)                         |

### Health check response

```json
{
  "status": "ok",
  "name": "transcend-mcp-server",
  "version": "3.0.2"
}
```

## Docker

```dockerfile
FROM node:22-slim
RUN npm install -g @transcend-io/mcp-server
ENV TRANSCEND_HTTP_HOST=0.0.0.0
EXPOSE 3000
CMD ["transcend-mcp", "--transport", "http"]
```

```bash
docker build -t transcend-mcp .
docker run -p 3000:3000 -e TRANSCEND_API_KEY=your-key transcend-mcp
```

## Reverse proxy (nginx)

Terminate TLS at the reverse proxy. The MCP server itself listens over plain HTTP.

```nginx
upstream mcp {
    server 127.0.0.1:3000;
}

server {
    listen 443 ssl;
    server_name mcp.example.com;

    ssl_certificate     /etc/ssl/certs/mcp.crt;
    ssl_certificate_key /etc/ssl/private/mcp.key;

    location / {
        proxy_pass http://mcp;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE support — disable buffering
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

## Cloud load balancer health check

Point your load balancer's health check at `GET /health` on the configured port. The endpoint returns HTTP 200 with a JSON body when the server is ready.

## Session management

Each MCP client connection gets a unique session ID returned in the `mcp-session-id` response header. Clients must include this header in subsequent requests.

Sessions are maintained in-memory within the server process. They can be resumed after temporary disconnection (the server stores SSE events for replay via `Last-Event-ID`). Sessions expire after the configured idle TTL (default 30 minutes).

Limitations of the current in-memory model:

- Sessions do not survive server restarts
- Sessions are not shared across multiple server processes (no sticky sessions at the load balancer)
- For multi-node deployments, use sticky sessions at the load balancer or deploy a persistent EventStore

## Troubleshooting

### 400 Bad Request: No valid session ID provided

The client sent a non-initialization request without a `mcp-session-id` header. Ensure the client sends the session ID from the initialization response in all subsequent requests.

### 404 Not Found (after providing session ID)

The session has expired or the server was restarted. The client should re-initialize by sending a new `initialize` request without a session ID.

### CORS errors in browser

Set `--cors-origin` or `TRANSCEND_MCP_CORS_ORIGINS` to the origin(s) of your browser-based client.

### Connection refused on 0.0.0.0

When binding to `0.0.0.0` (e.g. in Docker), the SDK's DNS rebinding protection is disabled. If you need Host header validation with a public binding, use `--host 0.0.0.0` and configure your reverse proxy to set a trusted `Host` header.

### SSE streams dropping

Ensure your reverse proxy has buffering disabled and a long read timeout for the `/mcp` path. See the nginx configuration above.
