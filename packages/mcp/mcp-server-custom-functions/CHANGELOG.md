# @transcend-io/mcp-server-custom-functions

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
