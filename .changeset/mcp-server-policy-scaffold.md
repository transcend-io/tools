---
'@transcend-io/mcp-server-policy': minor
'@transcend-io/utils': minor
'@transcend-io/cli': patch
---

Scaffold `@transcend-io/mcp-server-policy` and share Policy Engine bundle size limits from `@transcend-io/utils`.

The new MCP package provides the Policy Engine server shell (OAuth scopes, client helpers, and error formatting). Bundle upload limits (`MAX_BUNDLE_COMPRESSED_BYTES` / `MAX_BUNDLE_DECOMPRESSED_BYTES`) now live in `@transcend-io/utils` so the CLI and MCP server share one source of truth.
