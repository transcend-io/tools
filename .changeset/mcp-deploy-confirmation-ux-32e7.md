---
"@transcend-io/mcp-server-base": patch
"@transcend-io/mcp-server-consent": patch
---

Confirmation tools cap the deploy-summary step at eight seconds, send progress notifications every ten seconds while waiting, and show different text for a timed-out summary versus a failed one. The consent deploy tool description explains retrying when an approval form expires before anyone answers.