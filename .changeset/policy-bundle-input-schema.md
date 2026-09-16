---
'@transcend-io/cli': minor
---

`policy new` writes each bundle's input JSON Schema as `input.schema.json` inside the publish directory (for example `permissions-bundle/input.schema.json`) instead of a shared workspace `schemas/` folder. VS Code setup no longer sets `opa.schema`. Pass `--schema` with that file path when type-checking input during `policy eval` / `policy test`.
