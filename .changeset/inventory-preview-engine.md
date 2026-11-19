---
'@transcend-io/sdk': minor
'@transcend-io/cli': patch
---

`transcend inventory pull` now writes data silo business entities as `businessEntityTitles`, so pushing a pulled file keeps those links.

The SDK adds `planPush` and `renderPushPlan` to compare a `transcend.yml` with your organization and list what a push would create, update, or delete.
