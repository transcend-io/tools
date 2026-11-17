---
'@transcend-io/mcp-server-base': minor
---

Add `requireLocalFilesystem` to tool definitions. The server omits these tools over HTTP. Add `createGraphqlRequestClient` and `TranscendGraphQLBase.requestHeaders()` so SDK functions can reuse the MCP client's auth.
