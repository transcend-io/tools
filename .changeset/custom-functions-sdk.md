---
'@transcend-io/sdk': minor
---

Add custom function sync support. The SDK gains Diffie-Hellman channel helpers (`createDhEncryptionKeys`, `createDhEncrypted`), an API-key → Sombra session exchange (`createSombraApiKeySession`), and typed custom function fetch/diff/sync helpers (`fetchAllCustomFunctions`, `syncCustomFunction`). Existing custom functions are matched by `id` when provided, falling back to exact name, with an error on ambiguous names.
