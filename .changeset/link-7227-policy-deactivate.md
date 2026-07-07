---
'@transcend-io/cli': minor
---

Add `transcend policy deactivate` subcommand

`transcend policy deactivate --bundle-name <name>` takes a policy bundle's
currently active version offline, completing the publish/activate/bundles/versions/deactivate
lifecycle tooling.

Use kebab-case flags for `transcend policy *` commands

Policy CLI flags are now kebab-case (e.g. `--bundle-name`, `--transcend-url`,
`--dry-run`) instead of camelCase. Single-word flags (`--auth`, `--json`,
`--version`, `--dir`, `--limit`, `--offset`, `--after`, `--description`) are unchanged.

Rename `transcend policy list` to `transcend policy bundles`

Aligns bundle listing with `transcend policy versions` naming.

Confirm before creating a new bundle on `transcend policy publish`

When `--bundle-name` does not match an existing bundle, the CLI prompts before
creating one. Pass `--yes` to skip the prompt in CI/non-interactive runs.

Simplify `transcend policy activate` to bundle name only

Activation accepts only `--bundle-name` and optional `--version`; the
`--policy-bundle-id` flag has been removed.
