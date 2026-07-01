---
"@transcend-io/cli": patch
---

Fix `transcend policy publish` to upload a Policy Engine-compatible tarball (`manifest.json` plus `.rego` files) instead of `opa build` output, validate Rego with `opa check --v0-compatible`, and surface API error messages on upload failure.
