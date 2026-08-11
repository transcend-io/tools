---
"@transcend-io/mcp-server-admin": patch
"@transcend-io/mcp-server-assessment": patch
"@transcend-io/mcp-server-consent": patch
"@transcend-io/mcp-server-dsr": patch
"@transcend-io/mcp-server-inventory": patch
"@transcend-io/mcp-server-preferences": patch
"@transcend-io/mcp-server-workflows": patch
---

Remove unused `confirmationHint` strings from 25 ungated tools. The field is never serialized into `tools/list` and is only read by the confirmation gate, which none of these tools opt into.
