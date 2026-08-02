---
'@transcend-io/mcp-server-base': minor
---

Add `viewHtml`, which lets a UI resource serve its built document from disk instead of the copy inlined at build time when `TRANSCEND_MCP_DEV_VIEWS` is set.

Production behaviour is unchanged: without the variable the inlined string is returned, so the document is still validated once at construction. With it set, each `resources/read` re-reads the built file, so a view rebuild reaches the host without restarting the server or reconnecting the client.
