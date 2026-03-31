---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move business entities, vendors, and intl messages from CLI to SDK

- Add to `administration/` module in SDK: `fetchAllBusinessEntities`, `syncBusinessEntities`, `fetchAllVendors`, `syncVendors`, `fetchAllMessages`, `syncIntlMessages`
- Remove `colors` dependency from SDK - log messages are plain strings
- All imports updated to use `@transcend-io/sdk` directly
