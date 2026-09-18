---
'@transcend-io/mcp-server-admin': major
'@transcend-io/mcp': major
---

Remove `admin_create_api_key`.

API key creation is no longer available through the Admin MCP. Use the Transcend Dashboard or CLI to create keys; `admin_list_api_keys` and `admin_list_scopes` remain for inspection.
