---
'@transcend-io/mcp-server-custom-functions': minor
'@transcend-io/mcp': minor
'@transcend-io/mcp-server-inventory': patch
---

Custom Function MCP tools now keep secrets in the Admin Dashboard only. Pass `envVarNames` to declare placeholder names, or `environmentVariables` with `isSecret` when you need explicit secret vs plain classification. Signing uses split secret/plain env maps on Sombra 7.609.0+ so the Admin Dashboard no longer shows the legacy “Review which variables are secret” callout for API-managed functions. Enter real secret values in the dashboard. Updates keep existing secrets and allowed hosts unless you pass new values. `custom_functions_get_code` shows which environment variables still need dashboard values. OAuth now also requests `ManageSombraRootKeys`, `ConnectDataSilos`, and `ManageAccessControl` (re-authorize if you already connected).

**Migration:** If you previously passed `userDefinedEnv`, pass `envVarNames` instead and fill values in the dashboard. On update, omitting `allowedHosts` now keeps the saved allowlist; pass `[]` to reset to localhost only. Stored `custom_functions_test_run` calls no longer accept `allowedHosts` — use `custom_functions_upsert` to change the saved allowlist.
