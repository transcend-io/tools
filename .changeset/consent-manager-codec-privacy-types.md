---
'@transcend-io/privacy-types': minor
'@transcend-io/airgap.js-types': minor
'@transcend-io/sdk': patch
---

Move the consent-manager transcend.yml codec into privacy-types; it imports view state, browser language, and consent expiry enums from airgap.js-types. Drop the runtime privacy-types dependency from airgap.js-types (Region.country is typed as string). SDK and airgap.js-types import paths are unchanged.
