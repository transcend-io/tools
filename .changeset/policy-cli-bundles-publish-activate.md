---
'@transcend-io/cli': minor
---

Rename `transcend policy list` to `transcend policy bundles`

Aligns bundle listing with `transcend policy versions` naming.

Confirm before creating a new bundle on `transcend policy publish`

When `--bundle-name` does not match an existing bundle, the CLI prompts before
creating one. Pass `--yes` to skip the prompt in CI/non-interactive runs.

Simplify `transcend policy activate` to bundle name only

Activation accepts only `--bundle-name` and optional `--version`; the
`--policy-bundle-id` flag has been removed.
