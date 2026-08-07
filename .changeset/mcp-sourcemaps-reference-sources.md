---
'@transcend-io/mcp': patch
'@transcend-io/mcp-server-admin': patch
'@transcend-io/mcp-server-assessment': patch
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp-server-discovery': patch
'@transcend-io/mcp-server-docs': patch
'@transcend-io/mcp-server-dsr': patch
'@transcend-io/mcp-server-inventory': patch
'@transcend-io/mcp-server-preferences': patch
'@transcend-io/mcp-server-workflows': patch
---

Publish sourcemaps that reference their sources rather than embedding them, taking the maps across these packages from roughly 817 KB to 174 KB.

Stack traces keep their mapped TypeScript positions; what is lost is the surrounding code frame, and only where the sources are not on disk. A fair trade for a server a host launches as a subprocess, and the reason this is scoped to the MCP packages rather than set for every published library.
