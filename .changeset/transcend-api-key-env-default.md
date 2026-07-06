---
'@transcend-io/cli': minor
---

Default `--auth` to the `TRANSCEND_API_KEY` environment variable

All API-authenticated CLI commands (including every `transcend policy *`
command that calls the Transcend API) now fall back to the
`TRANSCEND_API_KEY` environment variable when `--auth` is not passed. Export
it once in your shell and omit `--auth` on every subsequent invocation:

```sh
export TRANSCEND_API_KEY=...
transcend policy list
transcend policy publish --dir=./policies --bundleName=main
```

When `TRANSCEND_API_KEY` is unset, `--auth` remains required, preserving
existing behavior. This mirrors the existing `TRANSCEND_API_URL` convention
already used for `--transcendUrl`.

Use version labels for `transcend policy activate`

`transcend policy activate` now accepts an optional `--version` flag with the
caller-supplied version label instead of a version UUID. When `--version` is
omitted, the command activates the latest uploaded version by `createdAt`.
After `transcend policy publish`, the printed activation hint uses the version
label rather than an internal ID.
