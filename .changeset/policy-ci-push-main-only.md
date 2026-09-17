---
'@transcend-io/cli': patch
---

Generated Policy Engine and Custom Functions GitHub Actions workflows no longer double-run on pull request updates. `push` is limited to `main`; PR validation still runs via `pull_request`.

If you already have a generated workflow, update its `push` trigger to include `branches: [main]`, or remove the workflow and re-run `policy init` / `custom-functions init` with CI enabled.
