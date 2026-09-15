---
'@transcend-io/cli': major
---

Breaking: unify Custom Function project selection across local development and deployment commands.

`custom-functions push` now accepts the project directory positionally, defaults to `transcend/custom-functions`, and uses `--manifest` for an explicit manifest path. Replace existing `custom-functions push --file=path/to/transcend-functions.yml` invocations with `custom-functions push --manifest=path/to/transcend-functions.yml`.

`custom-functions list` and `custom-functions push` also support `--json` for structured automation output.
