---
'@transcend-io/mcp-server-base': patch
---

Emit the `VALIDATION_ERROR` code from `ErrorCode` rather than a string literal.

Both sites already produced that exact string, so the wire format is unchanged. Naming it keeps the
two in step if the code is ever renamed.
