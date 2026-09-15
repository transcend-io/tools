---
'@transcend-io/cli': major
---

Breaking: `policy init` now scaffolds an **empty multi-bundle workspace** (shared Regal config and README only — no bundles or Rego). Add bundles with the new `policy new` command.

### New: `transcend policy new`

Adds a publishable `{name}-bundle/` directory to an initialized workspace from a template:

- **Generic** — a fail-closed teaching entrypoint (default root: `example`)
- **Permissions** — a Permission API starter with purpose preference resolution (default root: `permissions`)

```sh
transcend policy init
transcend policy new --template generic --name example --yes
transcend policy new --template permissions --name permissions --yes
```

`policy new` merges the root into `.regal/config.yaml`, creates bundle files, input schemas, and a gitignored local `input.json` (copy of the example). It also updates VS Code settings and lint tasks when `.vscode` is present.

`policy lint` and `policy test` now run `opa test -b` (bundle mode) so local `input.json` next to `input.example.json` no longer causes a merge error.

### Migration

- `policy init` no longer creates `example-bundle/` or any Rego — run `policy new` after init.
- `policy lint`, `test`, `eval`, and `publish` still default to `transcend/policy/example-bundle`.
- If you already use a flat `transcend/policy` publish directory, move the Rego tree and `.manifest` into `{root}-bundle/` (or pass that path explicitly).
