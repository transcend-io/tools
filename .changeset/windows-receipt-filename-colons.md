---
'@transcend-io/cli': patch
---

Sanitize colons out of auto-generated request receipt filenames so the bulk request `restart` and `upload` commands work on native Windows. `new Date().toISOString()` embeds colons (e.g. `04:33:12`), which are illegal characters in Windows filenames and caused the first receipt `writeFileSync` to fail with `ENOENT`.
