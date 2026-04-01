---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move cookies and data flows from CLI to SDK

- Add to `consent/` module in SDK: `fetchAllCookies`, `syncCookies`, `fetchAllDataFlows`, `syncDataFlows`
- All imports updated to use `@transcend-io/sdk` directly
