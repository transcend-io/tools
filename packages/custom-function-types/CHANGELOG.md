# @transcend-io/custom-function-types

## 0.2.0

### Minor Changes

- 7384caa: Add a guided local workflow for developing Custom Functions without Transcend credentials.

  `custom-functions init` creates a project and can set up Deno, editor recommendations, an AI authoring skill, and CI checks. `custom-functions new` adds a General or DSR starter with test payloads. `custom-functions run` exercises those payloads in a credential-free local Deno simulator and shows function logs. `custom-functions check` validates the project locally with Deno before it is pushed.

  The same `transcend-custom-functions` skill can also be installed directly from the Transcend tools repository with `npx skills`.

  The guided setup previews its changes and finishes with clear next steps and a compact prompt for handing remaining implementation or CI work to an AI coding agent.

## 0.1.0

### Minor Changes

- acd11da: Publish importable Custom Function contracts, generated test-payload schemas,
  and Monaco ambient declarations from one TypeScript source.
