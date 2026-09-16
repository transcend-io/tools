---
'@transcend-io/cli': minor
---

`policy new` can set a local publish folder with `--bundle-dir` independently of the package root (`--name`). Defaults remain `{name}-bundle/`. Workspace input schemas under `schemas/{root}/` are shared by root: adding another bundle with the same root reuses an existing schema instead of failing. Help text clarifies workspace vs local bundle path vs remote `--remote-bundle-name`.
