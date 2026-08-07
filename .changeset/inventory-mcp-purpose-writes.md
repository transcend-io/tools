---
'@transcend-io/mcp-server-inventory': minor
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp': minor
---

Add inventory MCP write tools for purpose of processing assignments, Processing Purposes / Vendors upserts, and expanded Data Systems updates (ZEL-8168). Enrich inventory read tools so agents can safely inspect silo vendor/purposes/owners, filter datapoints by silo, read full vendor metadata, and resolve business entities / data subjects before writing.
