---
'@transcend-io/cli': minor
'@transcend-io/sdk': minor
'@transcend-io/privacy-types': minor
'@transcend-io/type-utils': patch
---

Add workflow-configs pull and push support for DSR workflow settings (update-only). Configs are keyed by their unique title and support title, subtitle, description, internal name, action type, data subject, visibility, region collection, region list, per-region expiry times, and attribute keys. Adds typed `indexBy` utility to `@transcend-io/type-utils`.
