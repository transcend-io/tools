---
'@transcend-io/cli': minor
---

Add local Policy Engine scaffolding and validation.

Use `policy init` to create a Rego v1 starter with optional editor setup, an Agent Skill, and credential-free GitHub Actions validation.

`policy lint` now requires a manifest, OPA 1.x, and Regal, and verifies formatting, production compilation, and tests. Existing lint invocations may newly fail until these requirements are met.
