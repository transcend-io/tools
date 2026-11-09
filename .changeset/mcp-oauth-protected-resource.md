---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
---

Add opt-in public hosted mode to the MCP HTTP transport. Set `TRANSCEND_MCP_PUBLIC_URL` (or `--public-url`) to serve OAuth Protected Resource Metadata (RFC 9728) at `/.well-known/oauth-protected-resource`, answer unauthenticated MCP requests with `401` plus a `WWW-Authenticate` challenge, and ignore the `TRANSCEND_API_KEY` environment fallback. Behavior is unchanged when unset.
