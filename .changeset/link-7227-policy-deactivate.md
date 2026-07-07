---
'@transcend-io/cli': minor
---

Add `transcend policy deactivate` subcommand

`transcend policy deactivate --bundle-name <name>` takes a policy bundle's
currently active version offline, completing the publish/activate/list/versions/deactivate
lifecycle tooling.

Use kebab-case flags for `transcend policy *` commands

Policy CLI flags are now kebab-case (e.g. `--bundle-name`, `--transcend-url`,
`--policy-bundle-id`, `--dry-run`) instead of camelCase. Single-word flags
(`--auth`, `--json`, `--version`, `--dir`, `--limit`, `--offset`, `--after`,
`--description`) are unchanged.
