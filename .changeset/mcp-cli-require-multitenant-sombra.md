---
'@transcend-io/mcp': minor
'@transcend-io/mcp-server-admin': minor
'@transcend-io/mcp-server-assessment': minor
'@transcend-io/mcp-server-config': minor
'@transcend-io/mcp-server-custom-functions': minor
'@transcend-io/mcp-server-discovery': minor
'@transcend-io/mcp-server-docs': minor
'@transcend-io/mcp-server-dsr': minor
'@transcend-io/mcp-server-inventory': minor
'@transcend-io/mcp-server-policy': minor
'@transcend-io/mcp-server-preferences': minor
'@transcend-io/mcp-server-privacy-center': minor
'@transcend-io/mcp-server-workflows': minor
---

When you run an MCP server with public HTTP mode (`--public-url` or `TRANSCEND_MCP_PUBLIC_URL`), the CLI now enforces multi-tenant Sombra only. Self-hosted Sombra organizations are refused so the hosted endpoint does not read data behind a customer-managed Sombra.