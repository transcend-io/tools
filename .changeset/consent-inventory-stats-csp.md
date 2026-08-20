---
"@transcend-io/mcp-server-consent": minor
---

Add `dataFlows.triageTable` and `dataFlows.csp` to `consent_get_inventory_stats` so agents can use UI-matching data-flow counts without dropping CSP metrics from the backend rollup.

`consent_list_cookies` and `consent_list_data_flows` now paginate with shared `OffsetPaginationSchema` (`first`/`offset`) instead of a custom `limit`/`offset` pair.
