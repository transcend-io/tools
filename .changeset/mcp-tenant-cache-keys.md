---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-consent': patch
'@transcend-io/mcp': patch
---

Fix HTTP multi-tenant cache bleed for airgap bundle IDs.

Shared MCP HTTP sessions swap per-request auth via AsyncLocalStorage, but the
consent bundle ID cache was keyed only by the GraphQL client instance. The first
tenant on a sidecar session could poison later orgs (wrong bundle on consent
list/update tools).

The cache now keys by org id for session cookies (API key / OAuth use a hash of
the credential as the tenant stand-in).
