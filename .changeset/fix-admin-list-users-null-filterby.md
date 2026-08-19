---
'@transcend-io/mcp-server-admin': patch
'@transcend-io/mcp': patch
---

Fix `admin_list_users` crashing when no filter is provided by sending `filterBy: {}` instead of letting `$filterBy` resolve to `null`.
