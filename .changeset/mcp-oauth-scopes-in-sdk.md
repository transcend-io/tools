---
"@transcend-io/sdk": minor
"@transcend-io/mcp": patch
"@transcend-io/mcp-server-admin": patch
"@transcend-io/mcp-server-assessment": patch
"@transcend-io/mcp-server-config": patch
"@transcend-io/mcp-server-consent": patch
"@transcend-io/mcp-server-custom-functions": patch
"@transcend-io/mcp-server-discovery": patch
"@transcend-io/mcp-server-dsr": patch
"@transcend-io/mcp-server-inventory": patch
"@transcend-io/mcp-server-policy": patch
"@transcend-io/mcp-server-preferences": patch
"@transcend-io/mcp-server-privacy-center": patch
"@transcend-io/mcp-server-workflows": patch
---

Centralized MCP OAuth scope lists in the SDK so OAuth clients and servers can pin scopes by server type. Domain MCP packages no longer export per-server `*_OAUTH_SCOPES` constants; import `getMcpServerOAuthScopes` from `@transcend-io/sdk` instead.