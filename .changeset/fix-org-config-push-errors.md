---
'@transcend-io/sdk': patch
'@transcend-io/cli': patch
---

Fix `transcend.yml` push and pull for organization-to-organization copies.

- Data subject `active` now applies through `updateSubject`. The removed `toggleSubject` mutation caused every `active` push to fail.
- `syncConfigurationToTranscend` records every failure in `SyncResult.errors` with its resource and item, and uses the injected logger.
- Enricher `description` is now pulled, and a push no longer clears it when the input omits it.
- `createTemplate` now sends the required `type` and `product` fields.
