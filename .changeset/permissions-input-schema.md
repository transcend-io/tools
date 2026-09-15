---
'@transcend-io/cli': patch
---

Publish the Permissions API OPA input schema at `packages/cli/schema/permissions-policy-input.json`, and have `policy new --template permissions` scaffold from that published contract (including Preference Store-style purpose slugs like `Analytics`).
