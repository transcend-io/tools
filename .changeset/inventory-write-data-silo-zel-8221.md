---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp-server-inventory': minor
'@transcend-io/mcp': minor
---

Add `inventory_write_data_silo` to create or update data systems in one MCP call (ZEL-8221). Create-by-integrationName always creates a new silo; update-by-id applies metadata without title upsert. `inventory_create_data_silo` and `inventory_update_data_silo` stay callable but are hidden from `tools/list`.
