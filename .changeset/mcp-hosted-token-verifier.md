---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
'@transcend-io/mcp-server-admin': patch
'@transcend-io/mcp-server-assessment': patch
'@transcend-io/mcp-server-config': patch
'@transcend-io/mcp-server-custom-functions': patch
'@transcend-io/mcp-server-discovery': patch
'@transcend-io/mcp-server-docs': patch
'@transcend-io/mcp-server-dsr': patch
'@transcend-io/mcp-server-inventory': patch
'@transcend-io/mcp-server-policy': patch
'@transcend-io/mcp-server-preferences': patch
'@transcend-io/mcp-server-privacy-center': patch
'@transcend-io/mcp-server-workflows': patch
---

Public hosted mode of the MCP HTTP transport (`TRANSCEND_MCP_PUBLIC_URL`) now accepts verified OAuth access tokens only. The server checks each `Authorization: Bearer` token with the authorization server (OAuth 2.0 Token Introspection) and requires the token to be active, unexpired, and issued for this server. API keys and session cookies are not accepted in this mode.

- Set `TRANSCEND_MCP_INTROSPECTION_CLIENT_ID` and `TRANSCEND_MCP_INTROSPECTION_CLIENT_SECRET` when you set a public URL. The server does not start without them.
- A missing or invalid token gets `401` with a `WWW-Authenticate` challenge. If the authorization server cannot be reached, the request gets `503`.
- Sombra-backed tools run only for organizations on the multi-tenant Sombra. Organizations that self-host Sombra get an error that points them to the locally installed server (`npx @transcend-io/mcp`).

Nothing changes when no public URL is set.
