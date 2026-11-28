---
'@transcend-io/mcp-server-base': minor
---

MCP OAuth tokens now persist in the credential store with refresh locking, so multiple local MCP processes can share a login without racing refresh-token rotation.