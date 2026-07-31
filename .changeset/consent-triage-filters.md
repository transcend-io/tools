---
"@transcend-io/mcp-server-consent": minor
"@transcend-io/privacy-types": patch
---

Add consent triage filters and sorting: `unmappedOnly` (orphaned/unmapped approved data flows), `type` (data flow scope, e.g. CSP), and `minOccurrences` on `consent_list_data_flows`; `minOccurrences` and `occurrences` sorting on `consent_list_cookies`. Clarify `showZeroActivity` semantics so the default `NEEDS_REVIEW` totals reconcile with `consent_get_inventory_stats`.
