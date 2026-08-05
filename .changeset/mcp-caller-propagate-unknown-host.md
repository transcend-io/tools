---
'@transcend-io/mcp-server-base': patch
---

Fall back to a sanitized `clientInfo.name` for `x-transcend-mcp-caller` when the connected host is not in `McpHostClient`, so unrecognized stdio clients still get usage attribution instead of appearing as N/A.

Known hosts keep the canonical enum value, and an explicitly forwarded header still wins. Quirks and capability behavior remain enum-gated.
