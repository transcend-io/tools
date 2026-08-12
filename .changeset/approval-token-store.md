---
'@transcend-io/mcp-server-base': minor
---

**@transcend-io/mcp-server-base:** Add an in-memory `ApprovalTokenStore` for the confirmation-gate fallback path. A token is bound to a tool name, a hash of the arguments the caller was asked to approve, and the caller's auth subject; it is single-use, has a short TTL, and is claimed on the second `tools/call` that supplies it. The store is not yet wired into a gate — that arrives with the confirmation-gate PR — so this change ships an internal primitive with no user-visible behavior change.
