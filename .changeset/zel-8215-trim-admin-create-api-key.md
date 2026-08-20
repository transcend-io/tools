---
'@transcend-io/mcp-server-admin': minor
'@transcend-io/mcp': minor
---

Move the TRANSCEND_SCOPES catalog off `admin_create_api_key`'s tools/list descriptor onto compact `admin_list_scopes`, keeping runtime ScopeName validation on create. Cap every tool description at 700 characters and the umbrella tools/list JSON at 100k characters.
