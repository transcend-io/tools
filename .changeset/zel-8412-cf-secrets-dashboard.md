---
'@transcend-io/mcp-server-custom-functions': patch
'@transcend-io/mcp': patch
'@transcend-io/mcp-server-inventory': patch
---

Safer Custom Function authoring for agents: secrets stay in the dashboard, upsert reports verified env and allowed-host state, and DSR silo eligibility is clearer.

`custom_functions_upsert` no longer accepts secret values — pass `envVarNames` for placeholders and fill values in the Admin Dashboard. Placeholders use a non-empty `${NAME}` sentinel so Sombra persists the name (empty strings are treated as “keep prior” and drop new keys). Updates preserve stored secrets. Upsert responses return env names and `allowedHosts` from a post-write read (pending draft preferred over active), with warnings when declared values did not persist. On update, omit `allowedHosts` to keep the existing allowlist — passing `[]` resets to localhost-only. Allowed hosts are not shown in the Admin Dashboard; confirm via the upsert response or `custom_functions_get_code`. `custom_functions_test_run` warns when `allowedHosts` is passed on a stored `{ id }` run (those args only apply to unsaved code trials). Omit `code` on update for metadata-only changes. DSR attach requires a `NOT_CONFIGURED` CUSTOM_FUNCTION silo (one function per silo); inventory list/get describe that rule, and attach failures point agents at `inventory_get_data_silo` or omitting `dataSiloId`.
