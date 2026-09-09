---
'@transcend-io/mcp-server-dsr': major
'@transcend-io/mcp': major
---

Remove `dsr_respond_access`, `dsr_respond_erasure`, and `dsr_download_keys`.

These fulfillment/download tools expanded the MCP surface for privacy-sensitive operations
without a clear long-term product fit. Enrichment and request lifecycle tools remain.
