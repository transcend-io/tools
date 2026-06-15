---
'@transcend-io/cli': patch
'@transcend-io/mcp': patch
'@transcend-io/mcp-server-consent': patch
'@transcend-io/privacy-types': patch
'@transcend-io/sdk': patch
---

Add consent analytics MCP tools (`consent_get_aggregate_analytics`, `consent_get_timeseries_analytics`, `consent_get_analytics_data`) backed by new SDK airgap bundle analytics fetchers and consent analytics enums in privacy-types. Rename `consent_get_triage_stats` to `consent_get_inventory_stats` to clarify it returns inventory counts, not site analytics.
