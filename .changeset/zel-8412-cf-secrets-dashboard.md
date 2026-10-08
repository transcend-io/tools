---
'@transcend-io/mcp-server-custom-functions': minor
'@transcend-io/mcp': minor
'@transcend-io/mcp-server-inventory': patch
'@transcend-io/mcp-server-base': patch
---

Custom Function MCP tools now follow a clearer save → test → promote flow. `custom_functions_upsert` saves code and runtime settings as a draft; run `custom_functions_test_run` with `{ id }`, then `custom_functions_promote_version` to go live.

Environment variables use `environmentVariables` with `key`, `isSecret`, and optional `value` for **plain** variables only. Never pass secret values through MCP — users set secrets in the Admin Dashboard. `custom_functions_get_code` returns `settings` and `environmentVariables` (with `isSet`) and never echoes secret values.

**Migration**

- **`custom_functions_upsert`:** Replace `userDefinedEnv` with `environmentVariables`. Remove `testPayloads`, `promote`, and `setActive`; use `custom_functions_test_run` and `custom_functions_promote_version` instead.
- **`custom_functions_test_run`:** `userDefinedEnv` was removed. Unsaved trials run without env vars; stored runs use the saved environment.
- **`custom_functions_get_code`:** Returns `settings` and `environmentVariables` instead of `context`.
- **On update:** Omit `code` or `allowedHosts` to keep saved values. `[]` means localhost only.
- **Permissions:** The custom functions server now requests `ConnectDataSilos`. Re-authorize MCP when prompted.
