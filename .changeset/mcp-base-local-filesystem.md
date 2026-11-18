---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': patch
---

Add `requireLocalFilesystem` to tool definitions. The server omits these tools over HTTP. Add `createGraphqlRequestClient` and `TranscendGraphQLBase.requestHeaders()` so SDK functions can reuse the MCP client's auth. Add the `McpTransport` enum. `buildMcpServer` now takes `McpTransport.Stdio` or `McpTransport.Http` instead of a string.
