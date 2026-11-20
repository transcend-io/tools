---
"@transcend-io/cli": patch
"@transcend-io/sdk": minor
"@transcend-io/mcp-server-base": patch
"@transcend-io/mcp-server-config": minor
"@transcend-io/mcp-server-consent": minor
"@transcend-io/mcp": minor
---

Config push and consent deploy now show a short summary of pending changes in the human confirmation prompt. New read-only tools `config_preview_push` and `consent_preview_deploy` return full diffs for agents to show in chat before running the gated tools.