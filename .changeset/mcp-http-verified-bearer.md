---
'@transcend-io/mcp-server-base': minor
---

Public HTTP MCP transport now rejects unauthenticated requests and verifies OAuth access tokens through the authorization server before opening a session. Hosted public mode also refuses Sombra tools for organizations that self-host Sombra, so the server does not read data that stays end-to-end encrypted.