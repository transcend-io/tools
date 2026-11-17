---
'@transcend-io/mcp-server-config': minor
'@transcend-io/mcp': minor
---

Add `config_pull`, `config_push` and `config_get_schema`. They read and write `transcend.yml` files on disk, like `transcend inventory pull` and `push`. `config_push` needs confirmation. The tools run over stdio only. The unified server now requests every scope the pull and push paths can need.
