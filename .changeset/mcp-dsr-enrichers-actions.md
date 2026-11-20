---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-config': patch
'@transcend-io/mcp-server-dsr': minor
'@transcend-io/mcp-server-workflows': patch
'@transcend-io/mcp': minor
---

Add `dsr_list_enrichers`, `dsr_write_enrichers`, `dsr_list_actions` and `dsr_write_actions`. They read and write the `preflights` and `actions` sections of transcend.yml without a file on disk.

Export shared `createCollectedLogger` from the MCP base package so DSR and config tools reuse one implementation.
