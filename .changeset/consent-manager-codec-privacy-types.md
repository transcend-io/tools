---
'@transcend-io/privacy-types': minor
'@transcend-io/airgap.js-types': patch
'@transcend-io/sdk': patch
---

Move the consent-manager transcend.yml codec and the view state, browser language and consent expiry enums into privacy-types. airgap.js-types and sdk re-export them, so imports keep working.
