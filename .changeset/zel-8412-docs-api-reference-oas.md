---
'@transcend-io/mcp-server-docs': patch
'@transcend-io/mcp': patch
---

Return readable markdown for API-reference docs instead of raw HTML.

`docs_fetch` resolves `/docs/api-reference/` URLs through the published OpenAPI document, so webhook and endpoint pages no longer waste context on page chrome. Regular article markdown is unchanged.
