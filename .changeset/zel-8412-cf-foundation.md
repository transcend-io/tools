---
'@transcend-io/mcp-server-inventory': patch
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-custom-functions': patch
'@transcend-io/mcp': patch
---

Inventory and custom-function MCP tool descriptions are clearer for finding CUSTOM_FUNCTION silos and planning DSR integrations.

The custom functions server now requests `ConnectDataSilos` during OAuth consent (re-authorize when prompted). Signing helpers and GraphQL support for draft/active versions are in place for upcoming tool updates.
