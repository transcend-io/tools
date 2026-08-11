---
'@transcend-io/mcp-server-base': minor
---

Send `@transcend-io/mcp-server-base`'s own package version on outbound Transcend requests as `x-transcend-mcp-version`, so rollout dashboards can tell which clients have upgraded rather than inferring age from missing attribution headers.
