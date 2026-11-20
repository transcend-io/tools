---
"@transcend-io/mcp-server-base": minor
"@transcend-io/mcp-server-admin": minor
"@transcend-io/mcp-server-consent": minor
"@transcend-io/mcp-server-dsr": minor
"@transcend-io/mcp-server-inventory": minor
"@transcend-io/mcp-server-preferences": minor
"@transcend-io/mcp-server-privacy-center": minor
"@transcend-io/mcp-server-workflows": minor
"@transcend-io/mcp": minor
---

Section write tools now use the same push pipeline as `transcend inventory push` and share one result shape (`success`, `count`, `errors`, optional `warnings` and `logs`). Helpers live on `@transcend-io/mcp-server-base/transcend-yml`.

**Breaking for direct tool callers**

- Inventory write tools renamed `items` to section-specific args (for example `businessEntities`, `identifiers`, `attributes`).
- `privacy_center_write` renamed `publish` to `publishToPrivacyCenter`.
- DSR write results no longer use `synced` or per-item `{ item, message }` errors; they match other section writes.
- `consent_write_sites` uses the yaml codec for each site instead of a custom zod shape.

`privacy_center_write` now asks for confirmation before applying changes that can delete footer links.