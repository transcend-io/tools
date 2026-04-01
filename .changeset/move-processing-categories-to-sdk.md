---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move processing activities and data categories from CLI to SDK

- Add to `data-inventory/` module in SDK: `fetchAllProcessingActivities`, `syncProcessingActivities`, `fetchAllDataCategories`, `syncDataCategories`
- All imports updated to use `@transcend-io/sdk` directly
