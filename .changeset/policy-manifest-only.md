---
'@transcend-io/cli': major
---

Breaking: Policy bundle uploads now require an OPA `.manifest` file — `manifest.json` is no longer accepted. The CLI no longer renames `.manifest` to `manifest.json` when packing the upload tarball; `.manifest` is used end to end. Rename any remaining `manifest.json` files to `.manifest`.
