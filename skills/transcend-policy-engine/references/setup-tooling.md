# Setup and tooling

## Install the CLI

Install the Transcend CLI **≥ 11**:

```sh
npm install --global @transcend-io/cli@^11
transcend policy --help   # should list init, new, lint [<directory>], …
```

## Initialize safely

Run `transcend policy init --help` before choosing flags. The default target is
`transcend/policy`.

`policy init` creates an empty multi-bundle workspace — shared Regal config
(`project.roots: []`) and a README. No bundles or Rego are created.

Interactive initialization offers VS Code setup, this Agent Skill, and
validation-only GitHub Actions. Non-interactive automation enables only
explicitly supplied `--editor`, `--skill`, and `--ci` flags:

```sh
transcend policy init ./transcend/policy --editor --skill --ci --noInteractive --yes
```

Use `--dryRun` to inspect the complete transactional plan. Existing policy
files, manifests, Regal configuration, workflows, and customized managed
artifacts are preserved.

## Add bundles

After initializing the workspace, add bundles with `transcend policy new`:

```sh
transcend policy new --template generic --name example --yes
transcend policy new --template permissions --name permissions --yes
# optional: different local folder than {name}-bundle
transcend policy new --template permissions --name permissions --bundle-dir my-bundle --yes
```

Templates available:

- `generic` — A fail-closed teaching entrypoint (default root: `example`)
- `permissions` — A Permission API starter with purpose preferences (default root: `permissions`)

`--name` is the Rego package root. `--bundle-dir` is the local folder basename under
the workspace (default `{name}-bundle`). Remote publish uses `--bundle-name`, which
is unrelated to the local folder.

`policy new` creates the publish directory, its `.manifest`, Rego tree,
input fixtures, and input schema. It also merges the root into Regal config and
updates VS Code settings/tasks when `.vscode` is present.

## Required tools

- Use OPA 1.x for Rego v1 parsing, formatting, checks, tests, and bundle compilation.
- Use Regal for idiomatic Rego linting and editor language-server features.
- Run `opa version` and `regal version` to confirm the active executables.

The generated Regal configuration targets OPA 1.18.2 capabilities. Generated CI
installs OPA 1.18.2 and Regal 0.42.0; local tools only need to satisfy the
compatible versions reported by `policy init` and `policy lint`. Follow their
official installation links when a compatible tool is missing.

## Editor and CI

Repository-level VS Code settings should include:

- `opa.roots` — one entry per `{root}-bundle/` publish directory
- `opa.bundleMode: true` — avoid loading fixture JSON as data
- `opa.schema` — directory of input JSON Schemas (shared when multiple bundles
  need different envelopes)
- `json.schemas` — optional validation of `input.json` / `input.example.json`

Preserve custom settings and tasks when adapting generated editor files.

Generated GitHub Actions CI is read-only and credential-free: it installs pinned
tools and the pinned Transcend CLI, then runs `transcend policy lint` per
publish directory (matrix when multiple bundles exist). Locally, bare
`transcend policy lint` verifies every child under the workspace that contains
a `.manifest`:

```sh
transcend policy lint --noInteractive --json
transcend policy lint transcend/policy/example-bundle --noInteractive --json
```

Adapt triggers, runner labels, dependency installation, and caching to
established repository conventions without adding publish steps or secrets.
