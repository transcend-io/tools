---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp': patch
---

Fix HTTP multi-tenant cache bleed for airgap bundle IDs and Sombra hosts.

Shared MCP HTTP sessions swap per-request auth via AsyncLocalStorage, but the
consent bundle ID cache was keyed only by the GraphQL client instance and the
REST client sticky-cached the first resolved Sombra `customerUrl`. The first
tenant on a sidecar session could poison later orgs (wrong bundle on consent
list tools; wrong Sombra host for DSR/preferences).

Both caches now key by org id for session cookies (API key / OAuth use a hash
of the credential as the tenant stand-in).
