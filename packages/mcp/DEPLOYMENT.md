# Deploying Transcend MCP Servers over HTTP

This guide covers running Transcend MCP servers in HTTP mode for remote hosting. For local stdio usage (Claude Desktop, Cursor), see the package READMEs.

## Quick start

```bash
# Start the unified server in HTTP mode
TRANSCEND_API_KEY=your-api-key npx @transcend-io/mcp --transport http

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

| Variable                       | Default                                    | Description                                                                                                    |
| ------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `TRANSCEND_API_KEY`            | —                                          | Default API key. Required for stdio; optional for HTTP if using session cookie or per-request API key headers. |
| `TRANSCEND_API_URL`            | `https://api.transcend.io`                 | GraphQL backend API URL (matches CLI / main monorepo convention)                                               |
| `SOMBRA_URL`                   | `https://multi-tenant.sombra.transcend.io` | Sombra REST API URL (matches CLI / SDK convention)                                                             |
| `TRANSCEND_HTTP_PORT`          | `3000`                                     | HTTP listen port (overridden by `--port`)                                                                      |
| `TRANSCEND_HTTP_HOST`          | `127.0.0.1`                                | HTTP listen host (overridden by `--host`)                                                                      |
| `TRANSCEND_MCP_CORS_ORIGINS`   | —                                          | Comma-separated allowed CORS origins                                                                           |
| `TRANSCEND_MCP_SESSION_TTL_MS` | `1800000` (30 min)                         | Idle session timeout in milliseconds                                                                           |

## Authentication

HTTP mode supports two authentication methods. The server resolves credentials from each incoming initialization request in this priority order:

### 1. Session cookie (in-app dashboard)

When the MCP server is deployed as a sidecar or colocated service alongside the Transcend backend, the dashboard can forward the user's session cookie directly:

| Header                               | Description                                        |
| ------------------------------------ | -------------------------------------------------- |
| `Cookie: laravel_session=<token>`    | Session cookie from the Transcend dashboard        |
| `x-transcend-active-organization-id` | Organization UUID (required companion for cookies) |

Both headers must be present for cookie auth to activate. Each HTTP session gets its own isolated server instance, so different customers' sessions never share state.

For cookie-based auth to work, CORS must be configured to allow credentials. If the dashboard origin differs from the MCP server origin, set `--cors-origin` or `TRANSCEND_MCP_CORS_ORIGINS` to the dashboard's origin. The server automatically sets `credentials: true` and allows the `Cookie` and `x-transcend-active-organization-id` headers.

### 2. API key (external customers)

For programmatic access (Claude Enterprise, Cursor, custom agents), send an API key via headers:

1. `Authorization: Bearer <api-key>`
2. `X-Transcend-Api-Key: <api-key>`

### 3. Environment variable fallback

If no auth headers are present (or for stdio mode), the server falls back to the `TRANSCEND_API_KEY` environment variable.

### Multi-tenant deployments

Both cookie-based and API key-based auth support multi-tenancy. Each client session gets its own MCP `Server` instance with isolated API clients, so credentials from one session never leak to another.

### Sidecar pattern (auth-free init + per-request auth)

When the MCP server runs as a sidecar alongside Prometheus (Mastra), the server starts without any credentials — no `TRANSCEND_API_KEY` is needed. The MCPClient connects at startup to retrieve the tool catalog (auth-free initialization), and each subsequent `tools/call` request carries the calling user's session cookie and organization ID injected by Mastra's `buildMcpFetch`. The HTTP transport resolves auth from these per-request headers and stores them in `AsyncLocalStorage` so that the downstream GraphQL/REST clients automatically use the correct credentials for that request.

```
Dashboard → Backend BFF → Prometheus (Mastra) → MCP Server (sidecar)
                                                    │
                                    buildMcpFetch injects Cookie +
                                    x-transcend-active-organization-id
                                    on each tools/call request
```

Per-request auth is propagated via Node.js `AsyncLocalStorage` (`requestAuthContext`), so each inbound request carries its own isolated credentials through the entire async call chain. Concurrent requests on the same MCP session with different users' cookies are safe — no shared mutable auth state exists.

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
  "name": "transcend-mcp",
  "version": "3.0.2"
}
```

## Docker

```dockerfile
FROM node:22-slim
RUN npm install -g @transcend-io/mcp
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
        proxy_set_header Cookie $http_cookie;

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
