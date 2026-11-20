---
'@transcend-io/mcp-server-inventory': minor
'@transcend-io/mcp': minor
'@transcend-io/mcp-server-config': patch
'@transcend-io/sdk': patch
---

Add direct inventory MCP tools for business entities, data subjects, identifiers, processing activities, and custom fields in `transcend.yml`, and update the CLI/MCP parity map for those sections. The inventory server also requests request-identity, data subject request settings, and global attribute scopes.

Add a `@transcend-io/sdk/transcend-yml` package export (with matching build output) and point `config_pull` at it so hosted MCP tests load without circular imports.