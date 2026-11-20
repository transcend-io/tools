---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-docs': patch
---

Resolve optional stdio startup credentials for MCP servers that mix public and signed-in tools (fixes `docs_integration_lookup` in the standalone docs server), and verify OAuth client setup at startup when OAuth env vars are set without blocking public tools on verification failure.