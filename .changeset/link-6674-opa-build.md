---
'@transcend-io/cli': minor
---

Validate policy bundles compile with `opa build` before `transcend policy publish`

`transcend policy publish` now runs `opa build` against the policy directory
before packaging the upload tarball, so compile failures (syntax errors,
missing imports, undefined references, etc.) surface client-side with a clear
non-zero exit instead of after upload.

The upload payload is unchanged: the CLI still packages `manifest.json` plus
publishable `.rego` files (excluding `*_test.rego`) into the gzip tarball the
Policy Engine API expects. The `opa build` output is discarded — it is a
pre-publish compilation gate only, run in addition to the existing
`opa check --strict --v0-compatible` lint.
