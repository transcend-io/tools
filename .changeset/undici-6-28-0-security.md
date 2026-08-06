---
'@transcend-io/cli': patch
---

Update `undici` to 6.28.0 to pick up fixes for CVE-2026-15157 (CRLF injection via a blob-like body's `type` property), CVE-2026-16728 (response desynchronization via the retry interceptor), and CVE-2026-16729 (cookie attribute injection via `setCookie`).
