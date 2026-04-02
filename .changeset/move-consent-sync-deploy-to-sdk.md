---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move consent manager sync & deploy functions from CLI to SDK

- Add to `consent/` module in SDK: `syncConsentManager`, `deployConsentManager`, `updateConsentManagerToLatest`, `syncPartitions`, `fetchPartitions`
- All imports updated to use `@transcend-io/sdk` directly
