---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp-server-admin': minor
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-consent': minor
'@transcend-io/mcp-server-custom-functions': minor
'@transcend-io/mcp-server-discovery': minor
'@transcend-io/mcp-server-docs': minor
'@transcend-io/mcp-server-dsr': minor
'@transcend-io/mcp-server-inventory': minor
'@transcend-io/mcp-server-policy': minor
'@transcend-io/mcp-server-preferences': minor
'@transcend-io/mcp-server-workflows': minor
'@transcend-io/mcp': minor
---

Add the MCP `openWorldHint` tool annotation. `defineTool` defaults it to `false`, and every tool now sets it explicitly (`true` for tools that email data subjects or assignees, trigger downstream integrations, run user code, or read external documentation).
