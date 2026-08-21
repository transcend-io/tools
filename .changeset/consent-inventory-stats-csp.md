---
"@transcend-io/mcp-server-consent": minor
---

Make `consent_get_inventory_stats` data-flow counts match the Consent Manager table (CSP rows omitted, same as the UI).

`consent_list_cookies` and `consent_list_data_flows` now paginate with shared `OffsetPaginationSchema` (`first`/`offset`) instead of a custom `limit`/`offset` pair.
