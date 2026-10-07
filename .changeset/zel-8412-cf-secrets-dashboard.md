---
'@transcend-io/mcp-server-custom-functions': minor
'@transcend-io/mcp': minor
'@transcend-io/mcp-server-inventory': patch
---

Custom Function MCP tools now use a clearer save → test → promote flow. `custom_functions_upsert` only saves code and settings (draft for GENERAL updates); run `custom_functions_test_run` with `{ id }`, then `custom_functions_promote_version` to go live.

On update, omit `versionId` to continue the pending draft instead of starting another. `custom_functions_get_code` returns a `versions` list and can read any version by `versionId` (including inactive versions). Remove env vars with `removeEnvironmentVariables`.

Environment variables use a single `environmentVariables` input with `key`, `isSecret`, and optional `value` for **plain** variables only. Never pass secret values through MCP — users set secrets in the Admin Dashboard. Plain → secret encrypts the current value; the tool warns that older versions may still contain plaintext. `custom_functions_get_code` returns `settings` and `environmentVariables` (with `isSet`) and never echoes secret values.

**Migration:** Replace `envVarNames` with `environmentVariables` (`isSecret: true` for secrets). Remove `testPayloads`, `promote`, and `setActive` from upsert — use `custom_functions_test_run` and `custom_functions_promote_version` instead. On update, omit `allowedHosts` to keep the saved allowlist; pass `[]` for localhost only. Re-authorize MCP if prompted for updated scopes.
