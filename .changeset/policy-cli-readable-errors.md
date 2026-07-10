---
'@transcend-io/cli': patch
---

`transcend policy *` commands now show actionable error messages for common Policy Engine API failures (invalid API key, missing bundles, upload limits, rate limits) instead of raw HTTP stack traces. Pass `--debug` to include underlying technical details when troubleshooting.
