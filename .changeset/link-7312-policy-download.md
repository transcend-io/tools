---
'@transcend-io/cli': minor
---

Add `transcend policy download` subcommand

`transcend policy download --bundle-name <name> [--version <label>]` downloads a
compiled policy bundle tarball (`.tar.gz`) for local inspection, diffing, or
offline `opa eval` / `opa test`. When `--version` is omitted, downloads the
bundle's currently active version (errors if none is active).
