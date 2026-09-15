---
'@transcend-io/cli': major
---

Breaking: `policy init` now scaffolds a multi-bundle workspace under `transcend/policy`, with each publishable unit in a `{root}-bundle/` directory (starter: `example-bundle/`).

- Init still defaults to the workspace (`transcend/policy`).
- `policy lint`, `test`, `eval`, and `publish` default to `transcend/policy/example-bundle`.
- Shared Regal config and input schemas live at the workspace root; each bundle owns its `.manifest`.

If you already use a flat `transcend/policy` publish directory, move the Rego tree and `.manifest` into `{root}-bundle/` (or pass that path explicitly). No automatic migration is performed.
