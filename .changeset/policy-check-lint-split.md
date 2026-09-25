---
'@transcend-io/cli': major
---

**Breaking:** Rename the Policy Engine verification gate from `transcend policy lint` to `transcend policy check`. Use `transcend policy lint` for OPA formatting and Regal only.

Migration:

- Replace `transcend policy lint` (CI, scripts, VS Code tasks) with `transcend policy check` for the full gate (manifest, formatting, strict OPA check, Regal, and tests).
- Keep or switch to `transcend policy lint` when you only want formatting + Regal (`--fix` still repairs OPA formatting).
- Re-run `transcend policy init --editor` / `--ci` (or `policy new`) to refresh generated VS Code tasks and GitHub Actions; legacy `policy: lint*` tasks are migrated to `policy: check*`.
