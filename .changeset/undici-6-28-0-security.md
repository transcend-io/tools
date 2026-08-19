---
'@transcend-io/cli': patch
---

Bump `undici` from `6.27.0` to `6.28.0` to address CVE-2026-15157 (CRLF injection via blob-like body `type`, GHSA-m8rv-5g2x-5cg5), CVE-2026-16728 (downstream response desynchronization via retry interceptor, GHSA-8xcm-r25x-g524), and CVE-2026-16729 (cookie attribute injection via `setCookie`, GHSA-v3r7-h72x-cjcm).
