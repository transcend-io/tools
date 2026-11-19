---
'@transcend-io/cli': major
---

`transcend inventory push` now shows what it will create, update, or delete and asks you to confirm before it changes anything. This also applies to the legacy `tr-push` command.

**Migration:** in CI and other scripts with no terminal, add `--yes` to apply the push after the preview, or `--skipPreview` to keep the previous behavior of pushing straight away. Use `--dryRun` to look without changing anything. If your file already matches your organization, nothing is pushed.
