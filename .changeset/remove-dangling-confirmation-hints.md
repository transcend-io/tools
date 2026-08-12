---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp-server-dsr': patch
'@transcend-io/mcp-server-inventory': patch
---

Remove the `confirmationHint` field and its remaining call-site strings. #407 removed it from 25 tools; nine occurrences have re-appeared since (three in the platform interfaces and six in inventory / consent / dsr feature PRs). No code reads the field, so this is dead metadata. The upcoming confirmation-gate work introduces a separate `confirmation: { hint }` field with a semantic contract — deleting the old one first keeps that landing focused on adding the new API.
