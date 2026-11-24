---
"@transcend-io/privacy-types": minor
"@transcend-io/mcp-server-base": patch
"@transcend-io/mcp-server-admin": patch
"@transcend-io/mcp-server-assessment": patch
"@transcend-io/mcp-server-config": patch
"@transcend-io/mcp-server-consent": patch
"@transcend-io/mcp-server-custom-functions": patch
"@transcend-io/mcp-server-discovery": patch
"@transcend-io/mcp-server-docs": patch
"@transcend-io/mcp-server-dsr": patch
"@transcend-io/mcp-server-inventory": patch
"@transcend-io/mcp-server-policy": patch
"@transcend-io/mcp-server-preferences": patch
"@transcend-io/mcp-server-privacy-center": patch
"@transcend-io/mcp-server-workflows": patch
---

Add `McpToolErrorCode` to privacy-types as the canonical MCP tool failure codes (seven values). MCP packages use it instead of the former `ErrorCode` enum on mcp-server-base. Shared transcend types import matching enums from privacy-types directly rather than re-exporting them.