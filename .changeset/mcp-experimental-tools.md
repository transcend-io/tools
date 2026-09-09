---
'@transcend-io/mcp-server-base': minor
'@transcend-io/mcp': patch
---

Add an `experimental` flag on tools and gate registration behind `TRANSCEND_MCP_EXPERIMENTAL=1`.

Tools marked `experimental: true` are omitted from server and umbrella registry registration unless
the env var is exactly `1`, so unfinished surfaces stay out of the default catalog.
