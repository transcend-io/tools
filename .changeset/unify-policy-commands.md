---
'@transcend-io/cli': major
---

Breaking: use one consistent command shape across Policy Engine workflows.

`policy init`, `lint`, `test`, `eval`, and `publish` now accept the Policy project directory positionally and default to `transcend/policy`. Replace `--dir=./policies` or `--bundle=./policies` with a positional directory such as `transcend policy lint ./policies`.

Policy commands using `--json` now reserve stdout for valid JSON and do not prompt. Pass `--yes` with `policy publish --json` when creating a new bundle.
