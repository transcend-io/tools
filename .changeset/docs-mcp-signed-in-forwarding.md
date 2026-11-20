---
'@transcend-io/mcp-server-docs': minor
'@transcend-io/mcp': minor
---

Send a docs token (`TRANSCEND_DOCS_TOKEN` or the per-request sign-in) as a Bearer header to docs.transcend.io. Cache article bodies, the index, and search per token so gated pages stay private. `docs_list` rows now include `access`, and `docs_fetch` explains how to sign in when it returns a preview.
