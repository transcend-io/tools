---
'@transcend-io/cli': patch
---

Policy Engine bug-bash fixes for `transcend policy`:

- `--limit`/`--offset` on `policy bundles` and `--limit` on `policy versions` now reject fractional values and enforce the server-side cap of 100 client-side, instead of failing with an opaque API 400.
- `policy versions` distinguishes an empty page past the `--after` cursor ("No more versions … end of results") from a bundle with no versions.
- `policy publish` validates `manifest.json` shape (non-empty `roots` array) and that every Rego package is covered by a declared root, surfacing a clear error at upload time instead of a decide-time fail-closed.
- `policy publish` size-limit errors now report human-readable sizes (KiB/MiB) with the bundle's actual size and the limit.
- `--transcend-url` ending in `/v1` is rejected with a clear hint (the CLI appends `/v1` itself), avoiding an opaque `/v1/v1` 400.
- `policy activate` surfaces a clear "version is already the active version" message on 409.
