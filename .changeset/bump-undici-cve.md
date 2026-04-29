---
'@transcend-io/cli': patch
---

Bump `undici` from `^5.22.1` to `^6.24.0` to clear CVE-2026-1525 (HTTP request/response smuggling, GHSA-2mjp-6q6p-2qxm) and CVE-2026-1527 (CRLF injection via `upgrade` option, GHSA-4992-7rv2-5pvq). The `ProxyAgent` and `setGlobalDispatcher` API used in `src/logger.ts` is unchanged across the major bump.
