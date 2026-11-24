# @transcend-io/mcp-server-config

## 0.2.1

### Patch Changes

- 87ce10b: Add `McpToolErrorCode` to privacy-types as the canonical MCP tool failure codes (seven values). MCP packages import it from privacy-types directly (not re-exported through mcp-server-base). The former `ErrorCode` enum on mcp-server-base is removed.
- Updated dependencies [87ce10b]
  - @transcend-io/privacy-types@7.2.0
  - @transcend-io/mcp-server-base@3.2.1

## 0.2.0

### Minor Changes

- 2ec345c: Add `renderPushPlanDiff` for inventory push previews and a read-only `config_diff` MCP tool that returns a paste-ready diff before `config_push`.
- 234002f: Add `TRANSCEND_CONFIG_RESOURCES` to cap OAuth scopes and config pull/push to listed transcend.yml sections.
- f70a436: Config push and consent deploy now show a short summary of pending changes in the human confirmation prompt. New read-only tools `config_preview_push` and `consent_preview_deploy` return full diffs for agents to show in chat before running the gated tools.

### Patch Changes

- 5110643: Centralized MCP OAuth scope lists in the SDK so OAuth clients and servers can pin scopes by server type. Domain MCP packages no longer export per-server `*_OAUTH_SCOPES` constants; import `getMcpServerOAuthScopes` from `@transcend-io/sdk` instead.
- Updated dependencies [2ec345c]
- Updated dependencies [23bdda1]
- Updated dependencies [f4c51c9]
- Updated dependencies [5110643]
- Updated dependencies [f70a436]
- Updated dependencies [0c71caf]
- Updated dependencies [460eb96]
- Updated dependencies [353a73d]
- Updated dependencies [6eb83b5]
- Updated dependencies [8bd784e]
- Updated dependencies [faada80]
- Updated dependencies [3214d5b]
- Updated dependencies [ef4a7ba]
  - @transcend-io/sdk@3.4.0
  - @transcend-io/mcp-server-base@3.2.0
  - @transcend-io/privacy-types@7.1.2

## 0.1.2

### Patch Changes

- 69b40d1: Add `dsr_list_enrichers`, `dsr_write_enrichers`, `dsr_list_actions` and `dsr_write_actions`. They read and write the `preflights` and `actions` sections of transcend.yml without a file on disk.

  Export shared `createCollectedLogger` from the MCP base package so DSR, config, inventory, and workflows tools reuse one implementation.

- Updated dependencies [69b40d1]
- Updated dependencies [8e2bf2f]
- Updated dependencies [64d13d6]
  - @transcend-io/mcp-server-base@3.1.2

## 0.1.1

### Patch Changes

- 7217c74: Add `preferences_write_partitions`, `preferences_list_option_values`, `preferences_write_option_values`, `preferences_list_workflow_configs` and `preferences_write_workflow_configs`. They cover the partitions, preference-options and preference-workflow-configs sections of `transcend.yml`. The SDK adds `convertConsentWorkflowTriggersToInputs`, which `transcend inventory pull` now uses.
- ae6da74: Add `workflows_write_email_templates` so the MCP can create email templates like `transcend inventory push`. Add the `ManageEmailTemplates` scope to the workflows server.
- Updated dependencies [3b92b89]
- Updated dependencies [c466144]
- Updated dependencies [7217c74]
  - @transcend-io/mcp-server-base@3.1.1
  - @transcend-io/sdk@3.3.0

## 0.1.0

### Minor Changes

- 10e4fb7: Add `config_pull`, `config_push` and `config_get_schema`. They read and write `transcend.yml` files on disk, like `transcend inventory pull` and `push`. `config_push` needs confirmation. The tools run over stdio only. The unified server now requests every scope the pull and push paths can need.
