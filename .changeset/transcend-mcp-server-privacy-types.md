---
"@transcend-io/privacy-types": minor
"@transcend-io/sdk": patch
---

Publish `TranscendMcpServer` from privacy-types so transcend-io/main can import domain MCP server IDs without the full SDK or a local oauth-types shim. SDK imports the enum from privacy-types; its public export path is unchanged.