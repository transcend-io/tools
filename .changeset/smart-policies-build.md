---
'@transcend-io/cli': minor
---

Add local Policy Engine scaffolding and validation.

`policy init` creates a safe, publishable Rego v1 starter and can merge repository-level VS Code tooling, install a portable policy authoring skill, and generate credential-free GitHub Actions validation. The transactional setup preserves existing policy, editor, workflow, and customized skill content.

`policy lint` now requires a manifest, OPA 1.x, and Regal, and verifies formatting, production compilation, and tests. Existing lint invocations may newly fail until these requirements are met.
