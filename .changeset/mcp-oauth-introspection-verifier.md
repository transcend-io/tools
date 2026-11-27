---
'@transcend-io/mcp-server-base': minor
---

When public HTTP mode is enabled (`TRANSCEND_MCP_PUBLIC_URL` or `--public-url`), the server now verifies OAuth access tokens through the authorization server's introspection endpoint before handling MCP requests. Set `TRANSCEND_MCP_INTROSPECTION_CLIENT_ID` and `TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET` with a client allowed to call introspection; startup fails if the public URL is configured without them.