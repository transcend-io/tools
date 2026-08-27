---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp-server-preferences': patch
'@transcend-io/mcp': patch
---

Decouple `destructiveHint` from server confirmation gates so consequential
consent writes can require approval without marking them destructive to hosts.

Gate `consent_set_preferences`, `preferences_upsert`, and
`preferences_append_identifiers` behind human confirmation while keeping
`destructiveHint: false`.
