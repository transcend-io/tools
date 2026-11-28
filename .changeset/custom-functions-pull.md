---
'@transcend-io/cli': minor
'@transcend-io/sdk': patch
---

Add `transcend custom-functions pull` to download custom functions from an organization into your local `transcend-functions.yml` project. The output is ready to `push` into another organization, such as a lower environment. IDs are left out by default, and env values become `<<parameters.NAME>>` placeholders because Sombra encrypts them. Pull merges into an existing project. Pass `--force` to refresh functions already in the manifest, or `--includeIds` for a same-org backup.
