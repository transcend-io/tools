---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move request fetch functions from CLI to SDK

- Add `dsr-automation/` module to SDK: `fetchAllRequests`, `fetchRequestsTotalCount`, `fetchRequestDataSiloActiveCount`
- All imports updated to use `@transcend-io/sdk` directly
