---
'@transcend-io/cli': minor
'@transcend-io/custom-function-types': minor
---

Add a guided local workflow for developing Custom Functions without Transcend credentials.

`custom-functions init` creates a project and can set up Deno, editor recommendations, an AI authoring skill, and CI checks. `custom-functions new` adds a General or DSR starter with test payloads. `custom-functions run` exercises those payloads in a credential-free local Deno simulator and shows function logs. `custom-functions check` validates the project locally with the production Deno 2.4.5 runtime before it is pushed.

The same `transcend-custom-functions` skill can also be installed directly from the Transcend tools repository with `npx skills`.

The guided setup previews its changes and finishes with clear next steps and a compact prompt for handing remaining implementation or CI work to an AI coding agent.

Use `--parameters=name:value` to fill `<<parameters.name>>` placeholders. The existing `--variables` spelling remains available as a compatibility alias.

For safe local runs without network access, unresolved environment-only parameters receive synthetic placeholder values with a warning; pushes and file-path parameters still require explicit values.
