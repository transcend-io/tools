---
'@transcend-io/privacy-types': patch
'@transcend-io/cli': patch
---

Add `ServerWebhookAwaitingCallback` to the `ActionItemCode` enum so server webhook integrations that accept jobs but never call back can surface as action items. Regenerate the CLI `transcend.yml` JSON schema so the new code is reflected.
