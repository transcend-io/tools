---
'@transcend-io/privacy-types': patch
'@transcend-io/cli': patch
---

Add `ConsentSiteTelemetryStale` to the `ActionItemCode` enum so Consent Manager sites with stale telemetry can surface as action items. Regenerate the CLI `transcend.yml` JSON schema so the new code is reflected.
