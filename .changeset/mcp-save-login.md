---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': minor
---

The MCP servers now save your OAuth login, so restarting your MCP client no longer asks you to sign in again.

- The login is saved in the OS keychain, or in a file only your user can read when no keychain is available. Set `TRANSCEND_MCP_CREDENTIAL_STORE` to `auto`, `keyring`, `file`, or `memory` to choose.
- Run `npx -y @transcend-io/mcp status` to see where the login is saved, and `npx -y @transcend-io/mcp logout` to sign out.
- A network error while renewing the login no longer signs you out. The tool call fails with a retryable error and the login is kept.
