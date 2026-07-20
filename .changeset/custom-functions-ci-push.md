---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Add custom function CI sync support. The SDK gains Diffie-Hellman channel helpers (`createDhEncryptionKeys`, `createDhEncrypted`), an API-key → Sombra session exchange (`createSombraApiKeySession`), and typed custom function fetch/diff/sync helpers. The CLI gains `transcend custom-functions push` (manifest-driven create/update of custom function code revisions with change detection, draft + promote, and dry-run support) and `transcend custom-functions list`, designed to run from client CI via the new composite GitHub Action in `github-action/`. Manifest entries can pin a custom function `id` (required when names are not unique), and `push --updateManifest` writes assigned IDs back into the manifest.
