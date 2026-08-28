---
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp': patch
---

Add `MCP_SKIP_CONFIRMATION=1` to bypass server confirmation gates for local
automation and accept-path testing. Gated tools still declare `confirmation`
metadata; only runtime enforcement is skipped.
