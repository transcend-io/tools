---
'@transcend-io/mcp': minor
'@transcend-io/mcp-server-config': minor
---

Add `TRANSCEND_MCP_SERVERS` to `@transcend-io/mcp` to register a subset of domains (for example `config,consent`) and request only their OAuth scopes. `@transcend-io/mcp-server-config` now exports its `TRANSCEND_CONFIG_RESOURCES` helpers so the unified server can cap config scopes the same way.
