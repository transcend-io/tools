---
'@transcend-io/mcp-server-base': minor
---

Split MCP usage attribution into two outbound headers: `x-transcend-mcp-caller` stays an `McpHostClient` value (including `unknown` when unrecognized), and `x-transcend-mcp-client-name` carries a sanitized `clientInfo.name` for discovering hosts not yet in the enum.

An explicitly forwarded caller header still wins, since a caller proxying on a user's behalf knows its own identity best. The discovery header is sent whenever a usable name exists, independent of caller. Sanitization uses an ASCII allowlist so client-controlled names cannot break outbound `fetch`.
