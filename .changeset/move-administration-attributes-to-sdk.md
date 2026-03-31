---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move attribute, setResourceAttributes, and formatRegions functions from CLI to SDK

- Add attribute management to `administration/` module in SDK: `fetchAllAttributes`, `syncAttribute`, `setResourceAttributes`, `formatRegions`
- Export `attributeKey` GQL constants (`ATTRIBUTE_KEYS_REQUESTS`) from SDK for consumers
- All imports updated to use `@transcend-io/sdk` directly
