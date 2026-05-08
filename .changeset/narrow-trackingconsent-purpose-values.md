---
"@transcend-io/airgap.js-types": minor
---

Narrow `TrackingConsent.purposes` value type from `boolean | string | undefined` to `DefaultConsentConfigValue | undefined`. This restores precise type-checking for purpose values while preserving the accepted runtime shapes of booleans plus the existing Auto markers and BooleanString literals.
