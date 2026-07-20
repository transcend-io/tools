---
'@transcend-io/cli': minor
---

Add `transcend custom-functions push` (manifest-driven create/update of custom function code revisions with change detection, draft + promote, and dry-run support) and `transcend custom-functions list`, designed to run from client CI. Manifest entries can pin a custom function `id` (required when names are not unique), and `push --updateManifest` writes assigned IDs back into the manifest while preserving comments and `<<parameters.x>>` placeholders.
