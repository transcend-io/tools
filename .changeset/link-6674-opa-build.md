---
'@transcend-io/cli': minor
---

Compile policy bundles client-side with `opa build` in `transcend policy publish`

`transcend policy publish` now shells out to `opa build` to produce a standard
compiled OPA bundle (`.tar.gz` containing `/.manifest`, `/data.json`, and
`.rego`/`wasm` files) in a temp directory, then uploads the compiled blob to
`POST /api/v1/policy-engine/policy-bundles/:id/versions`. This replaces the
previous manual `tar` of `manifest.json` + `.rego` files.

This reverses the v10.12.2 workaround: the Policy Engine API now accepts and
validates standard OPA bundle structure (`.manifest`, `data.json`, `*.rego` or
`wasm`) and content-addresses the blob by SHA-256, so `opa build` output is
first-class. Server-side recompilation is no longer required.

Behavior changes:

- Rego compilation happens locally via `opa build`; the CLI exits non-zero with
  a clear error (Rego syntax errors, missing imports, etc.) on build failure.
- Rego test files (`*_test.rego`) are excluded from the compiled bundle via
  `opa build --ignore '*_test.rego'`.
- The pre-flight `opa` on PATH check is unchanged (still errors with an install
  hint when missing).
- The client-side compressed size pre-check is raised from 5 KiB to ~10 MiB to
  mirror the server-side `BUNDLE_MAX_BYTES` limit. The decompressed size
  pre-check has been removed (the server now only enforces the compressed
  limit).
