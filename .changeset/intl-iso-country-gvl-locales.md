---
'@transcend-io/internationalization': minor
'@transcend-io/airgap.js-types': minor
'@transcend-io/privacy-types': patch
'@transcend-io/mcp-server-consent': patch
---

Publish `IsoCountryCode`, IAB GVL translation locale keys, and `TCF_VENDOR_LIST_TRANSLATION_LOCALES` from `@transcend-io/internationalization` so downstream type packages can share them without layering violations. Consumers (`@transcend-io/privacy-types`, `@transcend-io/airgap.js-types`, `@transcend-io/mcp-server-consent`) adopt the shared locale constants without layering violations.