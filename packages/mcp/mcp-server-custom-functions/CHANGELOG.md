# @transcend-io/mcp-server-custom-functions

## 0.3.0

### Minor Changes

- 8c88bad: Custom Function MCP tools now follow a clearer save → test → promote flow. `custom_functions_upsert` saves code and runtime settings as a draft; run `custom_functions_test_run` with `{ id }`, then `custom_functions_promote_version` to go live.

  Environment variables use `environmentVariables` with `key`, `isSecret`, and optional `value` for **plain** variables only. Never pass secret values through MCP — users set secrets in the Admin Dashboard. `custom_functions_get_code` returns `settings` and `environmentVariables` (with `isSet`) and never echoes secret values.

  **Migration**
  - **`custom_functions_upsert`:** Replace `userDefinedEnv` with `environmentVariables`. Remove `testPayloads`, `promote`, and `setActive`; use `custom_functions_test_run` and `custom_functions_promote_version` instead.
  - **`custom_functions_test_run`:** `userDefinedEnv` was removed. Unsaved trials run without env vars; stored runs use the saved environment.
  - **`custom_functions_get_code`:** Returns `settings` and `environmentVariables` instead of `context`.
  - **On update:** Omit `code` or `allowedHosts` to keep saved values. `[]` means localhost only.
  - **Permissions:** The custom functions server now requests `ConnectDataSilos`. Re-authorize MCP when prompted.

### Patch Changes

- 510f6e4: Inventory and custom-function MCP tool descriptions are clearer for finding CUSTOM_FUNCTION silos and planning DSR integrations.

  The custom functions server now requests `ConnectDataSilos` during OAuth consent (re-authorize when prompted). Signing helpers and GraphQL support for draft/active versions are in place for upcoming tool updates.

- 1e03c24: `custom_functions_get_code`, `custom_functions_test_run`, and `custom_functions_promote_version` now align with a save → test → promote draft workflow, with clearer `nextStep` guidance after each step.
- Updated dependencies [510f6e4]
- Updated dependencies [8c88bad]
  - @transcend-io/mcp-server-base@2.5.5

## 0.2.6

### Patch Changes

- 393020f: Ensure all prod dependencies use caret (^) SemVer ranges
- Updated dependencies [393020f]
  - @transcend-io/mcp-server-base@2.5.4
  - @transcend-io/privacy-types@6.3.1

## 0.2.5

### Patch Changes

- Updated dependencies [f02f57e]
  - @transcend-io/privacy-types@6.3.0
  - @transcend-io/mcp-server-base@2.5.3

## 0.2.4

### Patch Changes

- Updated dependencies [e819811]
  - @transcend-io/mcp-server-base@2.5.2
  - @transcend-io/privacy-types@6.2.1

## 0.2.3

### Patch Changes

- Updated dependencies [3ae909e]
  - @transcend-io/privacy-types@6.2.0

## 0.2.2

### Patch Changes

- 9331229: Require human confirmation before Policy Engine publish/go-live and Custom Function upsert, promote, and test-run actions so those changes cannot run without your approval.

## 0.2.1

### Patch Changes

- Updated dependencies [f3a7dc8]
  - @transcend-io/mcp-server-base@2.5.1

## 0.2.0

### Minor Changes

- f5294d8: Add the Custom Functions MCP domain with list and get_code tools that unwrap signed source to plaintext without exposing JWTs.
- 7d2ba42: Add custom_functions_test_run and optional upsert testPayloads so agents can execute stored or unsaved code and set successfulTestRun when tests pass. Save and promote do not require a passing test.
- 8f8a9a0: Add custom_functions_upsert and custom_functions_promote_version: sign plaintext through Sombra, auto-resolve sombraId, auto-create a customFunction silo for DSR creates, and promote drafts.

### Patch Changes

- f5294d8: Adds read tools for custom functions
- 8f8a9a0: adds custom function upsert and promote tools
- Updated dependencies [f5294d8]
- Updated dependencies [fcbc71b]
- Updated dependencies [b86b173]
- Updated dependencies [c052029]
- Updated dependencies [8f8a9a0]
- Updated dependencies [20b054b]
  - @transcend-io/mcp-server-base@2.5.0
  - @transcend-io/privacy-types@6.1.0

## 0.1.0

### Minor Changes

- Initial Custom Functions MCP toolset.
