---
"@transcend-io/mcp-server-base": minor
---

Map GraphQL `extensions.code: "ACCESS_DENIED"` to MCP `PERMISSION_ERROR`, and serialize optional `details` (`route`, `requiredScopes`) on tool error results so Agentic Assist can classify scope denials without parsing the English message.
