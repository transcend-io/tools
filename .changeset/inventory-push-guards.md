---
'@transcend-io/cli': minor
---

Add `--expectBundleId` and `--resources` to `transcend inventory push`. `--expectBundleId` stops the push, before the preview, when the consent manager bundle id of the organization differs or the organization has no consent manager. `--resources` pushes only the named top-level sections of the file, using the same names as `inventory pull --resources`.
