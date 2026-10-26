---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-admin': patch
'@transcend-io/mcp-server-assessment': patch
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp-server-custom-functions': patch
'@transcend-io/mcp-server-discovery': patch
'@transcend-io/mcp-server-docs': patch
'@transcend-io/mcp-server-dsr': patch
'@transcend-io/mcp-server-inventory': patch
'@transcend-io/mcp-server-policy': patch
'@transcend-io/mcp-server-preferences': patch
'@transcend-io/mcp-server-workflows': patch
'@transcend-io/mcp': patch
---

Fix `tools/list` failing when a host installs a different Zod copy than the MCP SDK (common with pnpm). Tool input schemas are now converted with the server’s own Zod and handed to the SDK as plain JSON Schema.

Domain `mcp-server-*` packages now declare `zod` and `@modelcontextprotocol/sdk` as peer dependencies; `@transcend-io/mcp` still installs them for you. If you depend on a domain package alone, ensure those peers are present (npm/pnpm usually install them automatically).

Prefer the published `transcend-mcp` binary over pointing clients at `dist/cli.mjs`.
