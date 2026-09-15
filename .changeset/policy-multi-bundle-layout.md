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

`policy lint` and `policy test` default to the workspace (`transcend/policy`) and run against **every** immediate child that contains a `.manifest`. Pass one bundle path to target a single unit. Strict OPA checks use Rego v1 (no `--v0-compatible`).

`policy eval` and `policy publish` require an explicit bundle directory (one-bundle operations — no default path).

`policy eval` uses `--package` for the OPA query (renamed from `--pkg`) and forwards curated `opa eval` options (`--format`, `--schema`, `--explain`). Exit-on-result flags like OPA’s `--fail` are not exposed yet. `policy test` forwards `--format`, `--verbose`, and `--run` while keeping `-b` and `--fail-on-empty` owned by the CLI.

Generated Policy Engine CI and Regal config now pin **OPA 1.18.2** (Regal 0.42.0 capabilities). Help text distinguishes the **workspace** directory (`init` / `new` / `lint` / `test`) from a **bundle** directory (`eval` / `publish`).

### Migration

- `policy init` no longer creates `example-bundle/` or any Rego — run `policy new` after init.
- `policy lint` / `policy test` with no args cover all `.manifest` bundles under `transcend/policy`.
- `policy new` still scaffolds directories as `{name}-bundle/`; that suffix is a layout convention, not a discovery requirement.
- `policy new` merges the new root into existing `.regal/config.yaml` without wiping custom Regal settings; invalid `project.roots` fail instead of resetting.
- `policy eval` and `policy publish` no longer default to `transcend/policy/example-bundle` — pass the bundle directory explicitly.
- `policy eval --pkg` is now `--package`.
- Upgrade local/CI OPA to 1.18.2 (and Regal to ≥ 0.42.0 for the generated capabilities pin).
- If you already use a flat `transcend/policy` publish directory, move the Rego tree and `.manifest` into a child publish directory (or pass that path explicitly).
