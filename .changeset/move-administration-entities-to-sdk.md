---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move business entities, vendors, and intl messages from CLI to SDK

- Add to `data-inventory/` module in SDK: `fetchAllBusinessEntities`, `syncBusinessEntities`, `fetchAllVendors`, `syncVendors`
- Add to `administration/` module in SDK: `fetchAllMessages`, `syncIntlMessages`
- All imports updated to use `@transcend-io/sdk` directly
