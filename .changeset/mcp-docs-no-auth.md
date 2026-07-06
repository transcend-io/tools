---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp-server-docs': patch
'@transcend-io/mcp': patch
---

Add per-tool `requireAuth` (call time) and `requireStartupAuth` on `createMCPServer` (boot) so docs tools skip lazy OAuth in the umbrella server. The unified server includes MCP initialize instructions guiding agents to use docs tools for how-to questions before org-specific API tools.
