---
'@transcend-io/mcp-server-admin': major
'@transcend-io/mcp-server-base': patch
'@transcend-io/mcp-server-privacy-center': minor
'@transcend-io/mcp': major
---

Add `admin_write_teams` and a new Privacy Center MCP server for privacy center config, intl messages, and privacy-center policies (same SDK paths as `transcend inventory` push/pull). Teams writes ask for confirmation. Privacy-center tools use the `privacy_center_*` prefix.

**Breaking:** `admin_get_privacy_center` is removed from `@transcend-io/mcp-server-admin` and from the unified server. Use `privacy_center_get` on `@transcend-io/mcp-server-privacy-center` (or the umbrella server) instead.