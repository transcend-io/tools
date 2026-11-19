---
"@transcend-io/mcp-server-docs": patch
---

Fix `docs_list` search and section listing returning no articles since docs.transcend.io moved `llms.txt` to a nested list with relative URLs. The parser reads both layouts and now fails loudly when a non-empty file yields no articles.