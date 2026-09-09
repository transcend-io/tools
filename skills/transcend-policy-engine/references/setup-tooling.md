# Setup and tooling

## Initialize safely

Run `transcend policy init --help` before choosing flags. The default target is `transcend/policy`.

Interactive initialization offers VS Code setup, this Agent Skill, and validation-only GitHub Actions. Non-interactive automation enables only explicitly supplied `--editor`, `--skill`, and `--ci` flags:

```sh
transcend policy init ./transcend/policy --editor --skill --ci --noInteractive --yes
```

Use `--dryRun` to inspect the complete transactional plan. Existing policy files, manifests, Regal configuration, workflows, and customized managed artifacts are preserved.

## Required tools

- Use OPA 1.x for Rego v1 parsing, formatting, checks, tests, and bundle compilation.
- Use Regal for idiomatic Rego linting and editor language-server features.
- Run `opa version` and `regal version` to confirm the active executables.

The generated Regal configuration targets OPA 1.13.1 capabilities. Generated CI installs OPA 1.13.1 and Regal 0.42.0; local tools only need to satisfy the compatible versions reported by `policy init` and `policy lint`. Follow their official installation links when a compatible tool is missing.

## Editor and CI

Repository-level VS Code files scope OPA bundle roots and the `policy: lint` task to the selected policy directory. Preserve custom settings and tasks when adapting them.

Generated GitHub Actions CI is read-only and credential-free: it installs pinned tools and the pinned Transcend CLI, then runs `transcend policy lint`. Adapt triggers, runner labels, dependency installation, and caching to established repository conventions without adding publish steps or secrets.
