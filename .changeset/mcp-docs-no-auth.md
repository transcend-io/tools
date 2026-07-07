---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp-server-docs': patch
'@transcend-io/mcp': patch
'@transcend-io/mcp-server-admin': patch
'@transcend-io/mcp-server-assessment': patch
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp-server-discovery': patch
'@transcend-io/mcp-server-dsr': patch
'@transcend-io/mcp-server-inventory': patch
'@transcend-io/mcp-server-preferences': patch
'@transcend-io/mcp-server-workflows': patch
---

**@transcend-io/mcp-server-base:** Add per-tool `requireAuth` (call time) and `requireStartupAuth` on `createMCPServer` (boot). Add optional MCP initialize `instructions` on `buildMcpServer`, plus `resolveStdioStartupAuthOptional` for servers that include public tools.

**@transcend-io/mcp-server-docs:** Docs tools set `requireAuth: false` so they skip lazy OAuth. Standalone CLI uses `requireStartupAuth: false` (no API key or OAuth at startup). Remove unused docs OAuth scopes.

**@transcend-io/mcp:** Umbrella server uses optional startup auth, registers docs tools first, and ships initialize instructions guiding agents to `transcend_docs_list` / `transcend_docs_fetch` before org-specific API tools. Read CLI version from `package.json`.

**Domain MCP servers:** Read CLI version from `package.json` instead of a hardcoded value.
