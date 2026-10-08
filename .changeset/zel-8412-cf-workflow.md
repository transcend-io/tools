---
'@transcend-io/mcp-server-custom-functions': patch
'@transcend-io/mcp': patch
---

`custom_functions_get_code`, `custom_functions_test_run`, and `custom_functions_promote_version` now align with a save → test → promote draft workflow, with clearer `nextStep` guidance after each step.
