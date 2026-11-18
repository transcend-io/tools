---
'@transcend-io/mcp-server-admin': minor
'@transcend-io/mcp': minor
'@transcend-io/sdk': patch
---

Add admin tools to write teams and the privacy center, and to list and write intl messages and privacy center policies. Teams writes ask for confirmation.

`@transcend-io/sdk` now exports `@transcend-io/sdk/transcend-yml` so MCP config and admin tools can import transcend.yml codecs without pulling the full SDK barrel.
