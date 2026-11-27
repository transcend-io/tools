---
'@transcend-io/mcp-server-base': minor
---

Add OAuth 2.0 token introspection (RFC 7662) for public hosted MCP mode. When `TRANSCEND_MCP_PUBLIC_URL` is set, configure `TRANSCEND_MCP_INTROSPECTION_CLIENT_ID` and `TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET` so the HTTP transport can verify Bearer access tokens against your authorization server.