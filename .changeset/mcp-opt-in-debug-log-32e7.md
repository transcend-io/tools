---
"@transcend-io/mcp-server-base": patch
---

Set `TRANSCEND_MCP_LOG_FILE` to append one JSON line per MCP call (no argument values or tokens). The approval form ends with an eight-character ref while logging is on. Read the log with `pnpm mcp:timeline <file>`.