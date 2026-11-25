---
"@transcend-io/sdk": patch
"@transcend-io/mcp-server-base": patch
"@transcend-io/mcp-server-consent": patch
---

The consent deploy approval form now loads its summary fast and reads as one line, such as `TEST (/cm-test) changed since Nov 24, 2026, 8:12 PM EST: Core (loadOptions); Messages (en, fr-FR).` Deployed locale messages are compared by locale code, so the summary no longer lists every locale as changed. UI v2 messages compare in one shape, and `deploymentId` no longer counts as a change. Confirmation tools send progress notifications while they wait, cap the summary step at 8 seconds, and tell the person when the summary timed out or failed. Set `TRANSCEND_MCP_LOG_FILE` to write a per-call debug log, and run `pnpm mcp:timeline <file>` to read it.
