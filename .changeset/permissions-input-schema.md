---
'@transcend-io/privacy-types': minor
'@transcend-io/cli': patch
---

Publish the Permissions API OPA input schema at `packages/cli/schema/permissions-policy-input.json`, generated from the `@transcend-io/privacy-types` codec. `policy new --template permissions` scaffolds from that published contract (including Preference Store-style purpose slugs like `Analytics`).
