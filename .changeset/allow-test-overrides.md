---
'@transcend-io/mcp-server-base': patch
---

Gate test-only URL overrides behind `ALLOW_TEST_OVERRIDES=1` instead of `NODE_ENV=test` / Vitest detection. Unset or any other value disables the overrides. The Vitest suite sets the flag via `vitest.config.ts`.
